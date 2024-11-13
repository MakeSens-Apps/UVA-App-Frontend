import { Injectable } from '@angular/core';
import {
  Filesystem,
  Directory,
  Encoding,
  CopyResult,
  ReaddirResult,
  ReadFileResult,
  GetUriResult,
  WriteFileResult,
  PermissionStatus,
} from '@capacitor/filesystem';

/**
 * Represents an error response from S3 storage operations.
 * @interface
 */
interface ErrorFileSystemResponse {
  mensage?: string;
  name?: string;
  type?: 'FileSystemError' | 'unknown';
}

/**
 * Success response type for S3 storage operations.
 * Can contain a list of items or other structured data.
 * @interface
 */
interface FileSystemSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Error response type for S3 storage operations.
 * Contains error details in case of a failure.
 * @interface
 */
interface FileSystemErrorResponse {
  success: false;
  error: ErrorFileSystemResponse;
}

/**
 * Combined response type for S3 storage operations.
 * May represent either a success or an error response.
 */
export type FileSystemResponse<T> =
  | FileSystemSuccessResponse<T>
  | FileSystemErrorResponse;

@Injectable({
  providedIn: 'root',
})
export class FileSystemService {
  /**
   * Creates an instance of FileSystemService.
   * @memberof FileSystemService
   */
  constructor() {}

  /**
   * Writes data to a file in the specified directory. If the directory does not exist it creates it with recursive true by default
   * @param {string} path - The path of the file to write to.
   * @param {string} data - The data to write to the file.
   * @param {Directory} directory - The directory where the file will be stored.
   * @returns {Promise<FileSystemResponse>} A promise that resolves to a FileSystemResponse indicating success or failure.
   */
  async writeFile(
    path: string,
    data: string,
    directory: Directory,
  ): Promise<FileSystemResponse<WriteFileResult>> {
    try {
      const result = await Filesystem.writeFile({
        path: path,
        data: data,
        directory: directory,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      return { success: true, data: result }; // Return success response
    } catch (err) {
      return { success: false, error: this.handleAuthError(err) }; // Handle error response
    }
  }

  /**
   * Reads data from a file in the specified directory.
   * @param {string} path - The path of the file to read.
   * @param {Directory} directory - The directory where the file is stored.
   * @param {boolean} code64 - The format to return
   * @returns {Promise<FileSystemResponse>} A promise that resolves to a FileSystemResponse containing the file data or an error.
   */
  async readFile(
    path: string,
    directory: Directory,
    code64?: boolean,
  ): Promise<FileSystemResponse<ReadFileResult>> {
    try {
      let result;
      if (code64) {
        result = await Filesystem.readFile({
          path: path,
          directory: directory,
        });
      } else {
        result = await Filesystem.readFile({
          path: path,
          directory: directory,
          encoding: Encoding.UTF8,
        });
      }

      return { success: true, data: result }; // Return success response
    } catch (err) {
      return { success: false, error: this.handleAuthError(err) }; // Handle error response
    }
  }

  /**
   * Deletes a file in the specified directory.
   * @param {string} path - The path of the file to delete.
   * @param {Directory} directory - The directory where the file is stored.
   * @returns {Promise<FileSystemResponse>} A promise that resolves to a FileSystemResponse indicating success or failure.
   */
  async deleteFile(
    path: string,
    directory: Directory,
  ): Promise<FileSystemResponse<null>> {
    try {
      await Filesystem.deleteFile({
        path: path,
        directory: directory,
      });
      return { success: true, data: null }; // No data returned on success
    } catch (err) {
      return { success: false, error: this.handleAuthError(err) }; // Handle error response
    }
  }

  /**
   * Copies a file from one location to another within the specified directory.
   * @param {string} from - The path of the file to copy.
   * @param {string} to - The destination path for the copied file.
   * @param {Directory} directory - The directory where the file is stored.
   * @returns {Promise<FileSystemResponse>} A promise that resolves to a FileSystemResponse indicating success or failure.
   */
  async copyFile(
    from: string,
    to: string,
    directory: Directory,
  ): Promise<FileSystemResponse<CopyResult>> {
    try {
      const result = await Filesystem.copy({
        from: from,
        to: to,
        directory: directory,
      });
      return { success: true, data: result }; // Return success response
    } catch (err) {
      return { success: false, error: this.handleAuthError(err) }; // Handle error response
    }
  }

  /**
   * Renames a file in the specified directory.
   * @param {string} from - The current path of the file.
   * @param {string} to - The new path for the renamed file.
   * @param {Directory} directory - The directory where the file is stored.
   * @returns {Promise<FileSystemResponse>} A promise that resolves to a FileSystemResponse indicating success or failure.
   */
  async renameFile(
    from: string,
    to: string,
    directory: Directory,
  ): Promise<FileSystemResponse<null>> {
    try {
      await Filesystem.rename({
        from: from,
        to: to,
        directory: directory,
      });
      return { success: true, data: null }; // Return success response
    } catch (err) {
      return { success: false, error: this.handleAuthError(err) }; // Handle error response
    }
  }

  /**
   * Creates a directory in the specified path.
   * @param {string} path - The path of the directory to create.
   * @param {Directory} directory - The directory where the new directory will be created.
   * @param {boolean} recursive - Whether to create the directory recursively.
   * @returns {Promise<FileSystemResponse>} A promise that resolves to a FileSystemResponse indicating success or failure.
   */
  async createDirectory(
    path: string,
    directory: Directory,
    recursive: boolean,
  ): Promise<FileSystemResponse<null>> {
    try {
      await Filesystem.mkdir({
        path: path,
        directory: directory,
        recursive: recursive,
      });
      return { success: true, data: null }; // Return success response
    } catch (err) {
      return { success: false, error: this.handleAuthError(err) }; // Handle error response
    }
  }

  /**
   * Reads the contents of a directory.
   * @param {string} path - The path of the directory to read.
   * @param {Directory} directory - The directory where the directory to read is located.
   * @returns {Promise<FileSystemResponse>} A promise that resolves to a FileSystemResponse containing the directory contents or an error.
   */
  async readDirectory(
    path: string,
    directory: Directory,
  ): Promise<FileSystemResponse<ReaddirResult>> {
    try {
      const result = await Filesystem.readdir({
        path: path,
        directory: directory,
      });
      return { success: true, data: result }; // Return success response
    } catch (err) {
      return { success: false, error: this.handleAuthError(err) }; // Handle error response
    }
  }

  /**
   * Retrieves the URI for a specified file.
   * @param {string} path - The path of the file to get the URI for.
   * @param {Directory} directory - The directory where the file is stored.
   * @returns {Promise<FileSystemResponse>} A promise that resolves to a FileSystemResponse containing the file URI or an error.
   */
  async getFileUri(
    path: string,
    directory: Directory,
  ): Promise<FileSystemResponse<GetUriResult>> {
    try {
      const result = await Filesystem.getUri({
        path: path,
        directory: directory,
      });
      return { success: true, data: result }; // Return success response
    } catch (err) {
      return { success: false, error: this.handleAuthError(err) }; // Handle error response
    }
  }

  /**
   * Requests permissions for file system access.
   * @returns {Promise<FileSystemResponse>} A promise that resolves to a FileSystemResponse indicating success or failure of the permission request.
   */
  async requestPermissions(): Promise<FileSystemResponse<PermissionStatus>> {
    try {
      const result = await Filesystem.requestPermissions();
      return { success: true, data: result }; // Return success response
    } catch (err) {
      return { success: false, error: this.handleAuthError(err) }; // Handle error response
    }
  }

  /**
   * Handles authentication and network errors from storage operations.
   * Maps specific error types to structured error information.
   * @param {unknown} err - The error encountered during a storage operation.
   * @returns {FileSystemErrorResponse} A structured error response with details on the error type and message.
   */
  private handleAuthError(err: unknown): ErrorFileSystemResponse {
    if (err instanceof Error) {
      console.error('Error: ', err.message);
      return { name: err.name, mensage: err.message, type: 'unknown' };
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
