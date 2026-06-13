/**
 * B05 — FileSystemService WEB SHIM
 *
 * Metro platform extension: this file is resolved instead of file-system.ts
 * when bundling for web (Expo web / react-native-web).
 *
 * Problem: expo-file-system is NOT available on web — it requires native APIs
 * (file:// URIs, makeDirectoryAsync, etc.) that do not exist in browsers.
 * Any call to it throws "ENOENT" or crashes the tab.
 *
 * Solution: implement the EXACT same FileSystemService contract using
 * localStorage as the backing store. Keys are the same paths that native code
 * would write to the document directory. This is sufficient for validation
 * sessions (S3 downloads work on web; content is stored in localStorage and
 * read back transparently). Binary BASE64 content is also stored as strings.
 *
 * Contract: identical exports to file-system.ts
 *   - Directory enum (same values)
 *   - FileSystemResponse<T>, WriteFileResult, ReadFileResult, etc.
 *   - fileSystemService singleton
 *   - default export FileSystemService class
 *
 * Limitations (web only, not a regression — native still uses expo-file-system):
 *   - localStorage size limit (~5MB per origin); large binary assets may fail gracefully.
 *   - copyFile / renameFile work in the key-space, not real FS.
 *   - readDirectory lists keys with a prefix.
 *   - requestPermissions always returns 'granted'.
 */

// ---------------------------------------------------------------------------
// Directory enum — identical to native (callers import from this module)
// ---------------------------------------------------------------------------

export enum Directory {
  Data = 'Data',
  Cache = 'Cache',
  Documents = 'Documents',
  External = 'External',
  ExternalStorage = 'ExternalStorage',
}

// ---------------------------------------------------------------------------
// Response types — identical to native (portability-matrix §3.2)
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
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a {path, directory} pair to a stable localStorage key.
 * Uses the same conceptual "base directory" separation as native, keeping
 * Data and Cache namespaced so they don't collide.
 */
function toKey(path: string, directory: Directory): string {
  // If it looks like a file:// URI (e.g., already absolute), strip the scheme.
  const cleanPath = path.startsWith('file://') ? path.slice(7) : path;
  const prefix = directory === Directory.Cache ? 'uva-web-cache' : 'uva-web-data';
  return `${prefix}:${cleanPath}`;
}

/**
 * Returns a synthetic "URI" for getFileUri — callers only need the string;
 * on web there is no real file, but the key can be used to retrieve content.
 */
function toUri(path: string, directory: Directory): string {
  return `web-fs://${toKey(path, directory)}`;
}

// ---------------------------------------------------------------------------
// FileSystemService — web implementation
// ---------------------------------------------------------------------------

class FileSystemService {
  /**
   * Writes data to localStorage.
   * Intermediate directories are a no-op on web (no real FS tree).
   */
  async writeFile(
    path: string,
    data: string,
    directory: Directory,
    _isBase64: boolean,
  ): Promise<FileSystemResponse<WriteFileResult>> {
    try {
      const key = toKey(path, directory);
      localStorage.setItem(key, data);
      return { success: true, data: { uri: toUri(path, directory) } };
    } catch (err) {
      return { success: false, error: this.handleError(err) };
    }
  }

  /**
   * Reads data from localStorage.
   */
  async readFile(
    path: string,
    directory: Directory,
    _code64?: boolean,
  ): Promise<FileSystemResponse<ReadFileResult>> {
    try {
      const key = toKey(path, directory);
      const content = localStorage.getItem(key);
      if (content === null) {
        throw new Error(`ENOENT: no such file: ${path}`);
      }
      return { success: true, data: { data: content } };
    } catch (err) {
      return { success: false, error: this.handleError(err) };
    }
  }

  /**
   * Deletes an entry from localStorage.
   */
  async deleteFile(
    path: string,
    directory: Directory,
  ): Promise<FileSystemResponse<null>> {
    try {
      const key = toKey(path, directory);
      localStorage.removeItem(key);
      return { success: true, data: null };
    } catch (err) {
      return { success: false, error: this.handleError(err) };
    }
  }

  /**
   * Copies a file within the localStorage key-space.
   */
  async copyFile(
    from: string,
    to: string,
    directory: Directory,
  ): Promise<FileSystemResponse<CopyResult>> {
    try {
      const fromKey = toKey(from, directory);
      const toKey2 = toKey(to, directory);
      const content = localStorage.getItem(fromKey);
      if (content === null) {
        throw new Error(`ENOENT: no such file: ${from}`);
      }
      localStorage.setItem(toKey2, content);
      return { success: true, data: { uri: toUri(to, directory) } };
    } catch (err) {
      return { success: false, error: this.handleError(err) };
    }
  }

  /**
   * Renames (moves) a file within the localStorage key-space.
   */
  async renameFile(
    from: string,
    to: string,
    directory: Directory,
  ): Promise<FileSystemResponse<null>> {
    try {
      const fromKey = toKey(from, directory);
      const toKey2 = toKey(to, directory);
      const content = localStorage.getItem(fromKey);
      if (content === null) {
        throw new Error(`ENOENT: no such file: ${from}`);
      }
      localStorage.setItem(toKey2, content);
      localStorage.removeItem(fromKey);
      return { success: true, data: null };
    } catch (err) {
      return { success: false, error: this.handleError(err) };
    }
  }

  /**
   * Creates a directory — no-op on web (no real FS tree).
   */
  async createDirectory(
    _path: string,
    _directory: Directory,
    _recursive: boolean,
  ): Promise<FileSystemResponse<null>> {
    // Directories are implicit in the key namespace; nothing to do.
    return { success: true, data: null };
  }

  /**
   * Lists all localStorage keys that start with the given path prefix.
   */
  async readDirectory(
    path: string,
    directory: Directory,
  ): Promise<FileSystemResponse<ReaddirResult>> {
    try {
      const prefix = toKey(path, directory);
      const files: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          // Return the relative name (strip the prefix)
          files.push(k.slice(prefix.length).replace(/^\//, ''));
        }
      }
      return { success: true, data: { files } };
    } catch (err) {
      return { success: false, error: this.handleError(err) };
    }
  }

  /**
   * Returns a synthetic URI for a given path.
   * On web, callers that need a displayable URL should use the content directly.
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
   * Always returns granted — browsers do not need explicit FS permissions.
   */
  async requestPermissions(): Promise<FileSystemResponse<PermissionStatus>> {
    return { success: true, data: { publicStorage: 'granted' } };
  }

  /**
   * Checks whether a localStorage key exists for the given path.
   */
  async fileExists(path: string, directory: Directory): Promise<boolean> {
    try {
      const key = toKey(path, directory);
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  }

  private handleError(err: unknown): ErrorFileSystemResponse {
    if (err instanceof Error) {
      console.error('FileSystemService[web] Error:', err.message);
      return { name: err.name, mensage: err.message, type: 'unknown' };
    }
    console.error('FileSystemService[web]: unknown error');
    return { name: 'unknownerror', mensage: 'unknown error', type: 'unknown' };
  }
}

/** Singleton — same export name as native (portability-matrix §4.1) */
export const fileSystemService = new FileSystemService();

export default FileSystemService;
