/**
 * B05 — S3Service WEB SHIM
 *
 * Metro platform extension: this file is resolved instead of s3.ts when bundling
 * for web (Expo web / react-native-web).
 *
 * Problem: s3.ts binary branch reads response.body.text() for PNG/JPG/SVG, which
 * returns garbled UTF-8 (binary bytes interpreted as text) rather than valid
 * base64. On native (Hermes) there is no Blob API, so this is the best option.
 * On web, browsers fully support Blob and FileReader, so we can:
 *   1. getUrl() → pre-signed URL
 *   2. fetch(url) → Response
 *   3. response.blob() → Blob
 *   4. FileReader.readAsDataURL → base64 data URI
 *
 * JSON/TXT branch: identical to s3.ts (downloadData + body.text()).
 *
 * Contract: identical exports to s3.ts
 *   - DataDownload, S3Response types
 *   - s3Service singleton
 *   - default export S3Service class
 *
 * IMPORTANT: This file is ONLY bundled when platform=web. Native (Android/iOS)
 * always uses s3.ts. No native code-path is altered.
 */

import {
  list,
  downloadData,
  getUrl,
  ListAllWithPathOutput,
  StorageError,
} from '@aws-amplify/storage';

// ---------------------------------------------------------------------------
// Types — identical to s3.ts (portability-matrix §3.2)
// ---------------------------------------------------------------------------

interface DataDownloadString {
  type: 'TXT' | 'JSON';
  content: string;
}

interface DataDownloadBase64 {
  /** Binary data returned as base64 string */
  type: 'BASE64';
  content: string;
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
// Helper: Blob → base64 string via FileReader (web only)
// ---------------------------------------------------------------------------

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // result is "data:<mime>;base64,<content>" — extract only the base64 part
      const base64 = result.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// ---------------------------------------------------------------------------
// S3Service — web implementation
// ---------------------------------------------------------------------------

class S3Service {
  /**
   * Lists files stored at a specific path.
   * Identical to s3.ts (list() is JS-pure, R-09).
   */
  async listFiles(path: string): Promise<S3Response<Item[]>> {
    try {
      const response = await list({
        path: path,
        options: { listAll: true },
      });
      return { success: true, data: this.processStorageList(response) };
    } catch (err) {
      return { success: false, error: this.handleAuthError(err) };
    }
  }

  /**
   * Retrieves a specific file from storage.
   * JSON/TXT: same as s3.ts (downloadData + body.text()).
   * Binary (png/jpg/jpeg/svg): getUrl() → fetch() → blob() → FileReader → base64.
   *   This is the correct web implementation: Blob and FileReader are available in
   *   all modern browsers but not in Hermes (React Native runtime).
   */
  async getFile(path: string): Promise<S3Response<DataDownload>> {
    try {
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
          return { success: true, data: { type: 'TXT', content: text } };
        }

        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'svg': {
          // Web branch: getUrl() returns a pre-signed HTTPS URL.
          // We fetch it, read as Blob, then convert to base64 via FileReader.
          // This avoids the garbled-UTF-8 problem of body.text() on binary data.
          const { url } = await getUrl({ path, options: { expiresIn: 60 } });
          const fetchResponse = await fetch(url.href);
          if (!fetchResponse.ok) {
            return {
              success: false,
              error: {
                name: 'FetchError',
                mensage: `HTTP ${fetchResponse.status} for ${path}`,
                type: 'network',
              },
            };
          }
          const blob = await fetchResponse.blob();
          const base64 = await blobToBase64(blob);
          return {
            success: true,
            data: { type: 'BASE64', content: base64, extension: fileExtension },
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
   * Processes a list of storage elements — identical to s3.ts.
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
