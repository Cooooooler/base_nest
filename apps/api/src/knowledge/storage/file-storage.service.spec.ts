import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileStorageService } from './file-storage.service';

jest.mock('fs/promises');

describe('FileStorageService', () => {
  let service: FileStorageService;
  const pathSep = path.sep;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset env
    delete process.env.STORAGE_LOCAL_PATH;

    const module: TestingModule = await Test.createTestingModule({
      providers: [FileStorageService],
    }).compile();

    service = module.get<FileStorageService>(FileStorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('save', () => {
    it('should write file to storage and return path', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const buffer = Buffer.from('test content');
      const result = await service.save('myfile.txt', buffer);

      expect(result).toContain('myfile.txt');
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should use custom storage path from env', async () => {
      process.env.STORAGE_LOCAL_PATH = '/custom/storage';
      // Re-instantiate with env
      const module = await Test.createTestingModule({
        providers: [FileStorageService],
      }).compile();
      const svc = module.get<FileStorageService>(FileStorageService);

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await svc.save('test.txt', Buffer.from('test'));
      const mkdirCall = (fs.mkdir as jest.Mock).mock.calls[0][0];
      expect(mkdirCall).toContain(pathSep + 'custom' + pathSep + 'storage');
    });
  });

  describe('read', () => {
    it('should read file from disk', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('file content'));

      const result = await service.read('/path/to/file.txt');
      expect(result.toString()).toBe('file content');
      expect(fs.readFile).toHaveBeenCalledWith('/path/to/file.txt');
    });
  });

  describe('delete', () => {
    it('should unlink file', async () => {
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      await service.delete('/path/to/file.txt');
      expect(fs.unlink).toHaveBeenCalledWith('/path/to/file.txt');
    });

    it('should not throw if file does not exist', async () => {
      (fs.unlink as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      await expect(service.delete('/nonexistent')).resolves.not.toThrow();
    });
  });
});
