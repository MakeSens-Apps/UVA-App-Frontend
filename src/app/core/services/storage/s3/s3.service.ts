import { Injectable } from '@angular/core';
import {
  list,
  downloadData,
  ListAllWithPathOutput,
  StorageError,
} from '@aws-amplify/storage';

interface dataDownloadString {
  type: 'TXT' | 'JSON';
  content: string;
}
interface dataDownloadBlob {
  type: 'BLOB';
  content: Blob;
}

export type dataDownload = dataDownloadString | dataDownloadBlob;

/**
 * Represents an item with storage metadata.
 * @interface
 */
interface Item {
  path: string;
  eTag?: string;
  lastModified?: Date;
  size: number;
}

/**
 * Represents an error response from S3 storage operations.
 * @interface
 */
interface ErrorS3Response {
  mensage?: string;
  name?: string;
  type?: 'S3Validation' | 'network' | 'authentication' | 'unknown';
}

/**
 * Success response type for S3 storage operations.
 * Can contain a list of items or other structured data.
 * @interface
 */
interface S3SuccessResponse<T> {
  success: true;
  data: T; //Item[] | StorageDownloadDataOutput<ItemWithPath>;
}

/**
 * Error response type for S3 storage operations.
 * Contains error details in case of a failure.
 * @interface
 */
interface S3ErrorResponse {
  success: false;
  error: ErrorS3Response;
}

/**
 * Combined response type for S3 storage operations.
 * May represent either a success or an error response.
 */
export type S3Response<T> = S3SuccessResponse<T> | S3ErrorResponse;

@Injectable({
  providedIn: 'root',
})
export class S3Service {
  /**
   * Creates an instance of S3Service.
   * @memberof S3Service
   */
  constructor() {}

  /**
   * Lists files stored at a specific path based on the `racimoID`.
   * Uses an asynchronous call to retrieve all files under the public path
   * associated with the provided identifier and processes them into an array of `Item` objects.
   * @param {string} path - The cluster identifier used to construct the storage path.
   * @returns {Promise<S3Response>} A promise resolving to an `S3Response`, containing either the list of files (`Item[]`) or error information.
   * @throws Logs an error message to the console if an error occurs while listing files.
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
   * Retrieves a specific file from storage based on its path.
   * Includes download progress logging to the console.
   * @param {string} path - The path to the file in storage.
   * @returns {Promise<S3Response>} A promise resolving to an `S3Response`, containing either the file data or error information.
   * @throws Logs an error message to the console if an error occurs while downloading the file.
   */
  async getFile(path: string): Promise<S3Response<dataDownload>> {
    try {
      const response = await downloadData({
        path: path,
        options: {
          onProgress: (progress) => {
            if (progress.totalBytes && progress.totalBytes > 0) {
              console.info(
                `Download progress: ${(progress.transferredBytes / progress.totalBytes) * 100}%`,
              );
            } else {
              console.info('No es un archivo');
            }
          },
        },
      }).result;

      // Extraer la extensión del archivo
      const fileExtension = path.split('.').pop()?.toLowerCase();
      let formattedData;

      // Convertir el contenido según la extensión
      switch (fileExtension) {
        case 'json':
          formattedData = JSON.parse(await response.body.text()); // Suponiendo que response.data es un string
          return {
            success: true,
            data: { type: 'JSON', content: formattedData },
          };

        case 'txt':
          formattedData = await response.body.text(); // Mantener el contenido como texto
          return {
            success: true,
            data: { type: 'TXT', content: formattedData },
          };

        case 'png': // Incluye otros tipos de blobs según sea necesario
        case 'jpg':
        case 'jpeg':
        case 'svg':
          return {
            success: true,
            data: {
              type: 'BLOB',
              content: await response.body.blob(),
            },
          };

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
   * Processes a list of storage elements and returns an array of `Item` elements.
   * Filters elements to include only those with a defined size (i.e., actual files).
   * @param {ListAllWithPathOutput} response - The response containing a list of elements to process.
   * @returns {Item[]} An array of `Item` objects, each containing `path`, `eTag`, `lastModified`, and `size` properties.
   */
  private processStorageList(response: ListAllWithPathOutput): Item[] {
    let files: Item[] = [];

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
   * Handles authentication and network errors from storage operations.
   * Maps specific error types to structured error information.
   * @param {unknown} err - The error encountered during a storage operation.
   * @returns {ErrorS3Response} A structured error response with details on the error type and message.
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
