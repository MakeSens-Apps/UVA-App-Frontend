/**
 * B05 Gate — FileSystemService tests
 * Gate criteria:
 *   1. writeFile creates intermediate directories (makeDirectoryAsync called with intermediates:true)
 *   2. writeFile with isBase64=false uses UTF8 encoding
 *   3. writeFile with isBase64=true uses Base64 encoding
 *   4. readFile returns {success:true, data:{data:string}}
 *   5. deleteFile calls deleteAsync
 *   6. createDirectory calls makeDirectoryAsync with the correct intermediates flag
 *   7. getFileUri returns a file:// URI
 *   8. fileExists returns true/false based on getInfoAsync
 */

/* eslint-disable import/first */
// Mock expo-file-system/legacy
const mockFSState = {
  files: new Map<string, string>(),
  dirs: new Set<string>(),
};

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///data/user/0/com.makesens.uvaapp/files/',
  cacheDirectory: 'file:///data/user/0/com.makesens.uvaapp/cache/',
  EncodingType: {
    UTF8: 'utf8',
    Base64: 'base64',
  },
  getInfoAsync: jest.fn(async (uri: string) => {
    const exists =
      mockFSState.files.has(uri) || mockFSState.dirs.has(uri);
    return { exists, isDirectory: mockFSState.dirs.has(uri) };
  }),
  makeDirectoryAsync: jest.fn(async (uri: string) => {
    mockFSState.dirs.add(uri);
  }),
  writeAsStringAsync: jest.fn(async (uri: string, content: string) => {
    mockFSState.files.set(uri, content);
  }),
  readAsStringAsync: jest.fn(async (uri: string) => {
    const content = mockFSState.files.get(uri);
    if (content === undefined) throw new Error('File not found: ' + uri);
    return content;
  }),
  deleteAsync: jest.fn(async (uri: string) => {
    mockFSState.files.delete(uri);
    mockFSState.dirs.delete(uri);
  }),
  copyAsync: jest.fn(async ({ from, to }: { from: string; to: string }) => {
    const content = mockFSState.files.get(from);
    if (content !== undefined) mockFSState.files.set(to, content);
  }),
  moveAsync: jest.fn(async ({ from, to }: { from: string; to: string }) => {
    const content = mockFSState.files.get(from);
    if (content !== undefined) {
      mockFSState.files.set(to, content);
      mockFSState.files.delete(from);
    }
  }),
  readDirectoryAsync: jest.fn(async (uri: string) => {
    return Array.from(mockFSState.files.keys())
      .filter((k) => k.startsWith(uri))
      .map((k) => k.replace(uri, ''));
  }),
}));

import * as ExpoFileSystem from 'expo-file-system/legacy';
import FileSystemService, {
  Directory,
  fileSystemService,
} from '@/data/storage/file-system';

beforeEach(() => {
  mockFSState.files.clear();
  mockFSState.dirs.clear();
  jest.clearAllMocks();

  // Re-bind mock implementations
  (ExpoFileSystem.getInfoAsync as jest.Mock).mockImplementation(
    async (uri: string) => {
      const exists =
        mockFSState.files.has(uri) || mockFSState.dirs.has(uri);
      return { exists, isDirectory: mockFSState.dirs.has(uri) };
    },
  );
  (ExpoFileSystem.makeDirectoryAsync as jest.Mock).mockImplementation(
    async (uri: string) => {
      mockFSState.dirs.add(uri);
    },
  );
  (ExpoFileSystem.writeAsStringAsync as jest.Mock).mockImplementation(
    async (uri: string, content: string) => {
      mockFSState.files.set(uri, content);
    },
  );
  (ExpoFileSystem.readAsStringAsync as jest.Mock).mockImplementation(
    async (uri: string) => {
      const content = mockFSState.files.get(uri);
      if (content === undefined) throw new Error('File not found: ' + uri);
      return content;
    },
  );
  (ExpoFileSystem.deleteAsync as jest.Mock).mockImplementation(
    async (uri: string) => {
      mockFSState.files.delete(uri);
      mockFSState.dirs.delete(uri);
    },
  );
});

describe('B05 — FileSystemService', () => {
  describe('writeFile', () => {
    it('creates intermediate directories before writing (R-20)', async () => {
      const svc = new FileSystemService();
      const result = await svc.writeFile(
        'public/racimos/CODE01/config.json',
        '{"test":1}',
        Directory.Data,
        false,
      );

      expect(result.success).toBe(true);
      expect(ExpoFileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        expect.stringContaining('public/racimos/CODE01'),
        { intermediates: true },
      );
    });

    it('uses UTF8 encoding for text files (isBase64=false)', async () => {
      const svc = new FileSystemService();
      await svc.writeFile('test.json', '{"x":1}', Directory.Data, false);

      expect(ExpoFileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.any(String),
        '{"x":1}',
        { encoding: 'utf8' },
      );
    });

    it('uses Base64 encoding for binary files (isBase64=true)', async () => {
      const svc = new FileSystemService();
      const b64 = 'iVBORw0KGgoAAAA=='; // fake PNG base64
      await svc.writeFile('image.png', b64, Directory.Data, true);

      expect(ExpoFileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.any(String),
        b64,
        { encoding: 'base64' },
      );
    });

    it('returns error response when write fails', async () => {
      const svc = new FileSystemService();
      (ExpoFileSystem.writeAsStringAsync as jest.Mock).mockRejectedValueOnce(
        new Error('disk full'),
      );

      const result = await svc.writeFile(
        'test.txt',
        'data',
        Directory.Data,
        false,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.mensage).toBe('disk full');
      }
    });
  });

  describe('readFile', () => {
    it('returns success with data when file exists', async () => {
      const svc = new FileSystemService();
      // Write a file first via mock
      mockFSState.files.set(
        'file:///data/user/0/com.makesens.uvaapp/files/config.json',
        '{"key":"val"}',
      );

      const result = await svc.readFile('config.json', Directory.Data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data).toBe('{"key":"val"}');
      }
    });

    it('returns error response when file not found', async () => {
      const svc = new FileSystemService();
      const result = await svc.readFile('missing.json', Directory.Data);

      expect(result.success).toBe(false);
    });

    it('uses base64 encoding when code64=true', async () => {
      const svc = new FileSystemService();
      mockFSState.files.set(
        'file:///data/user/0/com.makesens.uvaapp/files/img.png',
        'dGVzdA==',
      );
      await svc.readFile('img.png', Directory.Data, true);

      expect(ExpoFileSystem.readAsStringAsync).toHaveBeenCalledWith(
        expect.any(String),
        { encoding: 'base64' },
      );
    });
  });

  describe('createDirectory — intermediate dirs (R-20)', () => {
    it('calls makeDirectoryAsync with intermediates:true when recursive=true', async () => {
      const svc = new FileSystemService();
      const result = await svc.createDirectory(
        'public/racimos/CODE01/branding',
        Directory.Data,
        true,
      );

      expect(result.success).toBe(true);
      expect(ExpoFileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        expect.stringContaining('public/racimos/CODE01/branding'),
        { intermediates: true },
      );
    });

    it('calls makeDirectoryAsync with intermediates:false when recursive=false', async () => {
      const svc = new FileSystemService();
      await svc.createDirectory('simple_dir', Directory.Data, false);

      expect(ExpoFileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        expect.any(String),
        { intermediates: false },
      );
    });
  });

  describe('deleteFile', () => {
    it('calls deleteAsync and returns success', async () => {
      const svc = new FileSystemService();
      mockFSState.files.set(
        'file:///data/user/0/com.makesens.uvaapp/files/old.json',
        'data',
      );
      const result = await svc.deleteFile('old.json', Directory.Data);

      expect(result.success).toBe(true);
      expect(ExpoFileSystem.deleteAsync).toHaveBeenCalled();
    });
  });

  describe('getFileUri', () => {
    it('returns a file:// URI', async () => {
      const svc = new FileSystemService();
      const result = await svc.getFileUri(
        'public/racimos/CODE01/config.json',
        Directory.Data,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.uri).toMatch(/^file:\/\//);
        expect(result.data.uri).toContain('public/racimos/CODE01/config.json');
      }
    });
  });

  describe('fileExists', () => {
    it('returns true when file exists', async () => {
      const svc = new FileSystemService();
      mockFSState.files.set(
        'file:///data/user/0/com.makesens.uvaapp/files/exists.json',
        'data',
      );
      const exists = await svc.fileExists('exists.json', Directory.Data);
      expect(exists).toBe(true);
    });

    it('returns false when file does not exist', async () => {
      const svc = new FileSystemService();
      const exists = await svc.fileExists('ghost.json', Directory.Data);
      expect(exists).toBe(false);
    });
  });

  describe('singleton', () => {
    it('fileSystemService is an instance with writeFile', () => {
      expect(typeof fileSystemService.writeFile).toBe('function');
      expect(typeof fileSystemService.readFile).toBe('function');
      expect(typeof fileSystemService.getFileUri).toBe('function');
    });
  });
});
