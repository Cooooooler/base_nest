import { Injectable } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

@Injectable()
export class FileStorageService {
  private readonly basePath: string;

  constructor() {
    this.basePath = process.env.STORAGE_LOCAL_PATH || './storage';
  }

  async save(fileName: string, buffer: Buffer): Promise<string> {
    const dateDir = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const dir = path.join(this.basePath, 'documents', dateDir);
    await fs.mkdir(dir, { recursive: true });

    const uniqueName = `${Date.now()}-${fileName}`;
    const filePath = path.join(dir, uniqueName);
    await fs.writeFile(filePath, buffer);

    return filePath;
  }

  async read(filePath: string): Promise<Buffer> {
    return fs.readFile(filePath);
  }

  async delete(filePath: string): Promise<void> {
    await fs.unlink(filePath).catch(() => {});
  }
}
