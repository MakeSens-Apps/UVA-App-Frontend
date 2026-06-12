/**
 * B05 — FileSystemService
 * Ported from: src/app/core/services/storage/file-system/file-system.service.ts
 * Classification: Major adaptation
 * Changes:
 *   - @Injectable removed → singleton export (portability-matrix §4.1)
 *   - @capacitor/filesystem (Filesystem, Directory, Encoding) → expo-file-system
 *   - Capacitor {directory, path} relative URIs → expo-file-system absolute file:// URIs
 *   - makeDirectoryAsync({intermediates: true}) ensures parent dirs exist before write (R-20)
 *   - Directory enum preserved with same semantics: Data→documentDirectory, Cache→cacheDirectory
 *   - Signature {success, data|error} preserved exactly (portability-matrix §3.2)
 *   - Names of file/path parameters preserved exactly
 *   - EncodingType.Base64 used for binary (isBase64=true) vs UTF8 for text
 *
 * NOTE: The Capacitor 'Directory' enum is replaced by an equivalent RN enum below.
 *       All callers that import Directory from @capacitor/filesystem must be updated
 *       to import from this module instead.
 */

import * as ExpoFileSystem from 'expo-file-system/legacy';

// ---------------------------------------------------------------------------
// Directory enum — mirrors @capacitor/filesystem Directory for call-site compat
// ---------------------------------------------------------------------------

export enum Directory {
  /** Maps to expo-file-system documentDirectory */
  Data = 'Data',
  /** Maps to expo-file-system cacheDirectory */
  Cache = 'Cache',
  /** Maps to expo-file-system documentDirectory (Documents == Data for compat) */
  Documents = 'Documents',
  /** Maps to expo-file-system cacheDirectory (External/ExternalCache → cache) */
  External = 'External',
  ExternalStorage = 'ExternalStorage',
}

function resolveBase(directory: Directory): string {
  switch (directory) {
    case Directory.Cache:
    case Directory.External:
    case Directory.ExternalStorage:
      return (ExpoFileSystem.cacheDirectory ?? '') as string;
    case Directory.Data:
    case Directory.Documents:
    default:
      return (ExpoFileSystem.documentDirectory ?? '') as string;
  }
}

/** Converts {directory, relativePath} to an absolute file:// URI */
function toUri(path: string, directory: Directory): string {
  const base = resolveBase(directory);
  // If path already starts with file:// return as-is
  if (path.startsWith('file://') || path.startsWith('content://')) {
    return path;
  }
  // Ensure no double slash
  return base.endsWith('/') ? `${base}${path}` : `${base}/${path}`;
}

/** Extracts the directory URI part of a file URI */
function parentUri(fileUri: string): string {
  return fileUri.substring(0, fileUri.lastIndexOf('/'));
}

/** Ensures all parent directories exist before writing a file (R-20). */
async function ensureParentDirs(fileUri: string): Promise<void> {
  const dir = parentUri(fileUri);
  const info = await ExpoFileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await ExpoFileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

// ---------------------------------------------------------------------------
// Response types — preserved exactly from original (portability-matrix §3.2)
// ---------------------------------------------------------------------------

interface ErrorFileSystemResponse {
  mensage?: string;
  name?: string;
  type?: 'FileSystemError' | 'unknown';
}

interface FileSystemSuccessResponse<T> {
  success: true;
  data: T;
}

interface FileSystemErrorResponse {
  success: false;
  error: ErrorFileSystemResponse;
}

export type FileSystemResponse<T> =
  | FileSystemSuccessResponse<T>
  | FileSystemErrorResponse;

// Compatibility shims for Capacitor result types used by callers
export interface WriteFileResult {
  uri: string;
}
export interface ReadFileResult {
  data: string;
}
export interface CopyResult {
  uri: string;
}
export interface ReaddirResult {
  files: string[];
}
export interface GetUriResult {
  uri: string;
}
export interface PermissionStatus {
  publicStorage: 'granted' | 'denied' | 'prompt';
}

// ---------------------------------------------------------------------------
// FileSystemService
// ---------------------------------------------------------------------------

class FileSystemService {
  /**
   * Writes data to a file. Creates intermediate directories as needed (R-20).
   * @param {string} path - Relative or absolute path of the file.
   * @param {string} data - Data to write (string or base64).
   * @param {Directory} directory - Base directory.
   * @param {boolean} isBase64 - If true, writes as base64 (binary); otherwise UTF-8.
   */
  async writeFile(
    path: string,
    data: string,
    directory: Directory,
    isBase64: boolean,
  ): Promise<FileSystemResponse<WriteFileResult>> {
    try {
      const uri = toUri(path, directory);
      await ensureParentDirs(uri);

      await ExpoFileSystem.writeAsStringAsync(uri, data, {
        encoding: isBase64
          ? ExpoFileSystem.EncodingType.Base64
          : ExpoFileSystem.EncodingType.UTF8,
      });

      return { success: true, data: { uri } };
    } catch (err) {
      return { success: false, error: this.handleError(err) };
    }
  }

  /**
   * Reads data from a file.
   * @param {string} path - Relative or absolute path.
   * @param {Directory} directory - Base directory.
   * @param {boolean} [code64] - If true, reads as base64.
   */
  async readFile(
    path: string,
    directory: Directory,
    code64?: boolean,
  ): Promise<FileSystemResponse<ReadFileResult>> {
    try {
      const uri = toUri(path, directory);
      const data = await ExpoFileSystem.readAsStringAsync(uri, {
        encoding: code64
          ? ExpoFileSystem.EncodingType.Base64
          : ExpoFileSystem.EncodingType.UTF8,
      });
      return { success: true, data: { data } };
    } catch (err) {
      return { success: false, error: this.handleError(err) };
    }
  }

  /**
   * Deletes a file.
   * @param {string} path - Relative or absolute path.
   * @param {Directory} directory - Base directory.
   */
  async deleteFile(
    path: string,
    directory: Directory,
  ): Promise<FileSystemResponse<null>> {
    try {
      const uri = toUri(path, directory);
      await ExpoFileSystem.deleteAsync(uri, { idempotent: true });
      return { success: true, data: null };
    } catch (err) {
      return { success: false, error: this.handleError(err) };
    }
  }

  /**
   * Copies a file from one location to another.
   * @param {string} from - Source relative path.
   * @param {string} to - Destination relative path.
   * @param {Directory} directory - Base directory for both paths.
   */
  async copyFile(
    from: string,
    to: string,
    directory: Directory,
  ): Promise<FileSystemResponse<CopyResult>> {
    try {
      const fromUri = toUri(from, directory);
      const toUri = resolveBase(directory) + to;
      await ensureParentDirs(toUri);
      await ExpoFileSystem.copyAsync({ from: fromUri, to: toUri });
      return { success: true, data: { uri: toUri } };
    } catch (err) {
      return { success: false, error: this.handleError(err) };
    }
  }

  /**
   * Renames (moves) a file.
   * @param {string} from - Current relative path.
   * @param {string} to - New relative path.
   * @param {Directory} directory - Base directory for both paths.
   */
  async renameFile(
    from: string,
    to: string,
    directory: Directory,
  ): Promise<FileSystemResponse<null>> {
    try {
      const fromUri = toUri(from, directory);
      const toUri = resolveBase(directory) + to;
      await ensureParentDirs(toUri);
      await ExpoFileSystem.moveAsync({ from: fromUri, to: toUri });
      return { success: true, data: null };
    } catch (err) {
      return { success: false, error: this.handleError(err) };
    }
  }

  /**
   * Creates a directory.
   * @param {string} path - Relative or absolute path.
   * @param {Directory} directory - Base directory.
   * @param {boolean} recursive - Whether to create intermediate dirs.
   */
  async createDirectory(
    path: string,
    directory: Directory,
    recursive: boolean,
  ): Promise<FileSystemResponse<null>> {
    try {
      const uri = toUri(path, directory);
      await ExpoFileSystem.makeDirectoryAsync(uri, {
        intermediates: recursive,
      });
      return { success: true, data: null };
    } catch (err) {
      return { success: false, error: this.handleError(err) };
    }
  }

  /**
   * Reads the contents of a directory.
   * @param {string} path - Relative or absolute path.
   * @param {Directory} directory - Base directory.
   */
  async readDirectory(
    path: string,
    directory: Directory,
  ): Promise<FileSystemResponse<ReaddirResult>> {
    try {
      const uri = toUri(path, directory);
      const files = await ExpoFileSystem.readDirectoryAsync(uri);
      return { success: true, data: { files } };
    } catch (err) {
      return { success: false, error: this.handleError(err) };
    }
  }

  /**
   * Retrieves the URI for a specified file (always a file:// URI with expo-file-system).
   * @param {string} path - Relative or absolute path.
   * @param {Directory} directory - Base directory.
   */
  async getFileUri(
    path: string,
    directory: Directory,
  ): Promise<FileSystemResponse<GetUriResult>> {
    try {
      const uri = toUri(path, directory);
      return { success: true, data: { uri } };
    } catch (err) {
      return { success: false, error: this.handleError(err) };
    }
  }

  /**
   * Requests permissions for file system access.
   * expo-file-system handles permissions automatically on Android;
   * this is a no-op shim that always returns granted (R-20).
   */
  async requestPermissions(): Promise<FileSystemResponse<PermissionStatus>> {
    return { success: true, data: { publicStorage: 'granted' } };
  }

  /**
   * Checks whether a file or directory exists.
   * @param {string} path - Relative or absolute path.
   * @param {Directory} directory - Base directory.
   */
  async fileExists(path: string, directory: Directory): Promise<boolean> {
    try {
      const uri = toUri(path, directory);
      const info = await ExpoFileSystem.getInfoAsync(uri);
      return info.exists;
    } catch {
      return false;
    }
  }

  private handleError(err: unknown): ErrorFileSystemResponse {
    if (err instanceof Error) {
      console.error('FileSystemService Error:', err.message);
      return { name: err.name, mensage: err.message, type: 'unknown' };
    }
    console.error('FileSystemService: unknown error');
    return { name: 'unknownerror', mensage: 'unknown error', type: 'unknown' };
  }
}

/** Singleton — import-level DI replacement (portability-matrix §4.1) */
export const fileSystemService = new FileSystemService();

export default FileSystemService;
