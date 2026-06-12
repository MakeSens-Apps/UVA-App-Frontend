/**
 * B05 Gate — S3Service tests
 * Gate criteria:
 *   1. listFiles: returns Item[] with path/size (processStorageList)
 *   2. getFile JSON: body.text() + JSON.parse → {type:'JSON', content: object}
 *   3. getFile TXT: body.text() → {type:'TXT', content: string}
 *   4. getFile binary (png): body.text() → {type:'BASE64', content: string, extension: 'png'}
 *   5. getFile unsupported extension → {success:false}
 *   6. listFiles error → {success:false, error.mensage set}
 *   7. S3Response type discriminant works
 */

/* eslint-disable import/first */
// Mock @aws-amplify/storage
jest.mock('@aws-amplify/storage', () => {
  return {
    list: jest.fn(),
    downloadData: jest.fn(),
    StorageError: class StorageError extends Error {
      constructor(message: string, name: string) {
        super(message);
        this.name = name;
      }
    },
  };
});

import { list, downloadData } from '@aws-amplify/storage';
import S3Service, { s3Service } from '@/data/storage/s3';

beforeEach(() => {
  jest.clearAllMocks();
});

function makeDownloadResult(text: string) {
  return {
    result: Promise.resolve({
      body: {
        text: jest.fn().mockResolvedValue(text),
        blob: jest.fn().mockRejectedValue(new Error('blob not available in RN')),
      },
    }),
  };
}

describe('B05 — S3Service', () => {
  describe('listFiles', () => {
    it('returns Item[] from list response', async () => {
      (list as jest.Mock).mockResolvedValueOnce({
        items: [
          { path: 'public/racimos/CODE01/config.json', size: 512, eTag: 'abc', lastModified: new Date('2025-01-01') },
          { path: 'public/racimos/CODE01/branding/colors.json', size: 256, eTag: 'def', lastModified: new Date('2025-01-01') },
          { path: 'public/racimos/CODE01/', size: 0 }, // directory — should be filtered out
        ],
      });

      const svc = new S3Service();
      const result = await svc.listFiles('public/racimos/CODE01');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].path).toBe('public/racimos/CODE01/config.json');
        expect(result.data[0].size).toBe(512);
        expect(result.data[1].path).toBe('public/racimos/CODE01/branding/colors.json');
      }
    });

    it('returns empty array when no files', async () => {
      (list as jest.Mock).mockResolvedValueOnce({ items: [] });
      const svc = new S3Service();
      const result = await svc.listFiles('public/racimos/EMPTY');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });

    it('returns error response when list throws', async () => {
      (list as jest.Mock).mockRejectedValueOnce(new Error('NetworkError'));
      const svc = new S3Service();
      const result = await svc.listFiles('public/racimos/CODE01');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.mensage).toBeTruthy();
      }
    });
  });

  describe('getFile — JSON branch', () => {
    it('parses JSON and returns {type:"JSON", content: object}', async () => {
      const jsonContent = JSON.stringify({ primaryColor: '#00A651', name: 'UVA' });
      (downloadData as jest.Mock).mockReturnValueOnce(makeDownloadResult(jsonContent));

      const svc = new S3Service();
      const result = await svc.getFile('public/racimos/CODE01/config.json');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('JSON');
        if (result.data.type === 'JSON') {
          expect((result.data.content as Record<string, string>).primaryColor).toBe('#00A651');
        }
      }
    });
  });

  describe('getFile — TXT branch', () => {
    it('returns raw string with type TXT', async () => {
      (downloadData as jest.Mock).mockReturnValueOnce(
        makeDownloadResult('Hello World'),
      );

      const svc = new S3Service();
      const result = await svc.getFile('public/racimos/CODE01/readme.txt');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('TXT');
        if (result.data.type === 'TXT') {
          expect(result.data.content).toBe('Hello World');
        }
      }
    });
  });

  describe('getFile — binary branch (no Blob/btoa)', () => {
    it('returns BASE64 type for .png (no Blob)', async () => {
      // Simulate body.text() returning some string (base64 or raw)
      (downloadData as jest.Mock).mockReturnValueOnce(
        makeDownloadResult('iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB=='),
      );

      const svc = new S3Service();
      const result = await svc.getFile(
        'public/racimos/CODE01/branding/logo.png',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('BASE64');
        if (result.data.type === 'BASE64') {
          expect(result.data.extension).toBe('png');
          expect(result.data.content).toBeTruthy();
        }
      }
    });

    it('returns BASE64 type for .jpg', async () => {
      (downloadData as jest.Mock).mockReturnValueOnce(
        makeDownloadResult('/9j/4AAQSkZJRgAB=='),
      );
      const svc = new S3Service();
      const result = await svc.getFile('public/racimos/CODE01/branding/img.jpg');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('BASE64');
        if (result.data.type === 'BASE64') {
          expect(result.data.extension).toBe('jpg');
        }
      }
    });
  });

  describe('getFile — unsupported extension', () => {
    it('returns error for unknown file type', async () => {
      // downloadData not called for unsupported
      const svc = new S3Service();
      const result = await svc.getFile('public/racimos/CODE01/data.csv');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.mensage).toBe('Unsupported file type');
      }
    });
  });

  describe('getFile — error handling', () => {
    it('returns error response when downloadData throws', async () => {
      (downloadData as jest.Mock).mockReturnValueOnce({
        result: Promise.reject(new Error('Network timeout')),
      });

      const svc = new S3Service();
      const result = await svc.getFile('public/racimos/CODE01/config.json');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.mensage).toBeTruthy();
      }
    });
  });

  describe('S3Response discriminant', () => {
    it('success:true gives typed data', async () => {
      (list as jest.Mock).mockResolvedValueOnce({
        items: [{ path: 'public/racimos/A/b.json', size: 1 }],
      });
      const svc = new S3Service();
      const result = await svc.listFiles('public/racimos/A');

      if (result.success) {
        // TypeScript should narrow here
        const items = result.data;
        expect(Array.isArray(items)).toBe(true);
      }
    });

    it('success:false gives error with mensage (typo preserved, portability-matrix §4.4)', async () => {
      (list as jest.Mock).mockRejectedValueOnce(new Error('fail'));
      const svc = new S3Service();
      const result = await svc.listFiles('x');

      if (!result.success) {
        // typo 'mensage' is load-bearing (portability-matrix §4.4)
        expect('mensage' in result.error).toBe(true);
      }
    });
  });

  describe('singleton', () => {
    it('s3Service singleton has listFiles and getFile', () => {
      expect(typeof s3Service.listFiles).toBe('function');
      expect(typeof s3Service.getFile).toBe('function');
    });
  });
});
