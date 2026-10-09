/**
 * B05 — S3Service
 * Ported from: src/app/core/services/storage/s3/s3.service.ts
 * Classification: Major adaptation
 * Changes:
 *   - @Injectable removed → singleton export (portability-matrix §4.1)
 *   - aws-amplify/storage: list + downloadData preserved as-is (JS-pure, 1:1)
 *   - Binary branch: Blob/URL.createObjectURL/btoa removed → expo-file-system base64
 *     (response.body.blob() unavailable in Hermes; use getUrl() + downloadAsync + readAsStringAsync)
 *   - Routes public/racimos/<code>/... preserved EXACTLY (R-09/R-26)
 *   - processStorageList, handleAuthError logic preserved
 *   - typo `mensage` preserved (load-bearing, portability-matrix §4.4)
 *
 * BINARY STRATEGY (R-26 — FIXED):
 *   Original Ionic used response.body.blob() which is NOT available in Hermes.
 *   Previous RN attempt used response.body.text() which reads raw binary bytes as
 *   UTF-8 and produces a corrupted string (not valid base64).
 *
 *   Correct approach:
 *     1. getUrl({ path, options: { expiresIn: 60 } }) — pre-signed HTTPS URL
 *     2. ExpoFileSystem.downloadAsync(url.href, tmpUri) — write bytes to disk
 *     3. ExpoFileSystem.readAsStringAsync(tmpUri, { encoding: Base64 }) — read back as base64
 *     4. ExpoFileSystem.deleteAsync(tmpUri, { idempotent: true }) — clean up temp file
 *   This produces a valid base64 string that callers can write with isBase64=true.
 */

import {
  list,
  downloadData,
  getUrl,
  ListAllWithPathOutput,
  StorageError,
} from '@aws-amplify/storage';
import * as ExpoFileSystem from 'expo-file-system/legacy';

// ---------------------------------------------------------------------------
// Types — preserved from original (portability-matrix §3.2)
// ---------------------------------------------------------------------------

interface DataDownloadString {
  type: 'TXT' | 'JSON';
  content: string;
}

interface DataDownloadBase64 {
  /** B05 — binary data is returned as base64 string (no Blob/btoa in Hermes) */
  type: 'BASE64';
  content: string;
  /** Original file extension for MIME type inference by callers */
  extension: string;
}

export type DataDownload = DataDownloadString | DataDownloadBase64;

interface Item {
  path: string;
  eTag?: string;
  lastModified?: Date;
  size: number;
}

interface ErrorS3Response {
  mensage?: string;
  name?: string;
  type?: 'S3Validation' | 'network' | 'authentication' | 'unknown';
}

interface S3SuccessResponse<T> {
  success: true;
  data: T;
}

interface S3ErrorResponse {
  success: false;
  error: ErrorS3Response;
}

export type S3Response<T> = S3SuccessResponse<T> | S3ErrorResponse;

// ---------------------------------------------------------------------------
// S3Service
// ---------------------------------------------------------------------------

class S3Service {
  /**
   * Lists files stored at a specific path.
   * Preserved from original — routes public/racimos/<code>/... are identical (R-09).
   * @param {string} path - Storage path prefix.
   */
  async listFiles(path: string): Promise<S3Response<Item[]>> {
    try {
      const response = await list({
        path: path,
        options: {
          listAll: true,
        },
      });
      return { success: true, data: this.processStorageList(response) };
    } catch (err) {
      return { success: false, error: this.handleAuthError(err) };
    }
  }

  /**
   * Retrieves a specific file from storage.
   * JSON/TXT: body.text() + JSON.parse (same as original).
   * Binary (png/jpg/jpeg/svg): getUrl() + ExpoFileSystem.downloadAsync to a temp file,
   * then readAsStringAsync(Base64). This avoids response.body.blob() (unavailable in
   * Hermes) and response.body.text() (produces garbled UTF-8 for binary data) (R-26 fix).
   * @param {string} path - S3 path.
   */
  async getFile(path: string): Promise<S3Response<DataDownload>> {
    try {
      // Extraer la extensión del archivo
      const fileExtension = path.split('.').pop()?.toLowerCase() ?? '';

      switch (fileExtension) {
        case 'json': {
          const response = await downloadData({ path }).result;
          const text = await response.body.text();
          const formattedData = JSON.parse(text);
          return {
            success: true,
            data: { type: 'JSON', content: formattedData },
          };
        }

        case 'txt': {
          const response = await downloadData({ path }).result;
          const text = await response.body.text();
          return {
            success: true,
            data: { type: 'TXT', content: text },
          };
        }

        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'svg': {
          // Binary branch (R-26 fix):
          // response.body.blob() is NOT available in Hermes (React Native runtime).
          // response.body.text() on binary data produces garbled UTF-8, not valid base64.
          //
          // Correct approach:
          //   1. getUrl() → pre-signed HTTPS URL (expires in 60 s)
          //   2. ExpoFileSystem.downloadAsync() → write bytes to a temp file
          //   3. ExpoFileSystem.readAsStringAsync(...Base64) → valid base64 string
          //   4. Clean up temp file
          const { url } = await getUrl({ path, options: { expiresIn: 60 } });
          const tmpUri =
            (ExpoFileSystem.cacheDirectory ?? '') +
            `tmp_s3_${Date.now()}_${fileExtension}`;

          await ExpoFileSystem.downloadAsync(url.href, tmpUri);
          const base64 = await ExpoFileSystem.readAsStringAsync(tmpUri, {
            encoding: ExpoFileSystem.EncodingType.Base64,
          });
          await ExpoFileSystem.deleteAsync(tmpUri, { idempotent: true });

          return {
            success: true,
            data: {
              type: 'BASE64',
              content: base64,
              extension: fileExtension,
            },
          };
        }

        default:
          return {
            success: false,
            error: {
              name: 'file type nofound',
              mensage: 'Unsupported file type',
              type: 'unknown',
            },
          };
      }
    } catch (err) {
      return { success: false, error: this.handleAuthError(err) };
    }
  }

  /**
   * Processes a list of storage elements and returns Item[].
   * Preserved from original.
   */
  private processStorageList(response: ListAllWithPathOutput): Item[] {
    const files: Item[] = [];

    response.items.forEach((res) => {
      if (res.size) {
        files.push({
          path: res.path,
          eTag: res.eTag,
          lastModified: res.lastModified,
          size: res.size,
        });
      }
    });

    return files;
  }

  /**
   * Handles authentication and network errors.
   * Preserved from original — typo `mensage` is load-bearing (portability-matrix §4.4).
   */
  private handleAuthError(err: unknown): ErrorS3Response {
    if (err instanceof StorageError) {
      console.error(err.name);
      switch (err.name) {
        case 'UserNotFoundException':
          return {
            name: err.name,
            mensage: err.message,
            type: 'authentication',
          };
        case 'NotAuthorizedException':
          return {
            name: err.name,
            mensage: err.message,
            type: 'authentication',
          };
        case 'CodeMismatchException':
          return { name: err.name, mensage: err.message, type: 'S3Validation' };
        case 'NetworkError':
          return { name: err.name, mensage: err.message, type: 'network' };
        default:
          return { name: err.name, mensage: err.message, type: 'unknown' };
      }
    } else if (err instanceof Error) {
      console.error('unexpecteError');
      return { name: 'unexpecteError', mensage: err.message, type: 'unknown' };
    } else {
      console.error('unknownerror');
      return {
        name: 'unknownerror',
        mensage: 'unknown error',
        type: 'unknown',
      };
    }
  }
}

/** Singleton — import-level DI replacement (portability-matrix §4.1) */
export const s3Service = new S3Service();

export default S3Service;
