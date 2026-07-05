import { Injectable } from '@nestjs/common';

@Injectable()
export class ContextService {
  private store: Map<string, any> = new Map();

  constructor(inputs: Record<string, any>) {
    this.flatten('inputs', inputs);
  }

  setNodeOutput(nodeId: string, output: Record<string, any>): void {
    this.store.set(`nodes.${nodeId}.output`, output);
    this.flatten(`nodes.${nodeId}`, output);
  }

  resolve(template: string): string {
    return template.replace(/\{\{([\w.]+)\}\}/g, (_, path: string) => {
      const value = this.getByPath(path);
      if (value === undefined) return `{{${path}}}`;
      if (typeof value === 'object' && value !== null) {
        const keys = Object.keys(value);
        if (keys.length === 1) return String(value[keys[0]]);
        return JSON.stringify(value);
      }
      return String(value);
    });
  }

  resolveConfig(config: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string') {
        result[key] = this.resolve(value);
      } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.resolveConfig(value);
      } else if (Array.isArray(value)) {
        result[key] = value.map(v =>
          typeof v === 'string' ? this.resolve(v) : v
        );
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  snapshot(): Map<string, any> {
    return new Map(this.store);
  }

  private getByPath(path: string): any {
    if (this.store.has(path)) return this.store.get(path);
    const parts = path.split('.');
    for (let i = parts.length - 1; i >= 1; i--) {
      const prefix = parts.slice(0, i).join('.');
      const suffix = parts.slice(i).join('.');
      if (this.store.has(prefix)) {
        const obj = this.store.get(prefix);
        if (obj && typeof obj === 'object') {
          const value = suffix.split('.').reduce((o: any, k: string) => o?.[k], obj);
          if (value !== undefined) return value;
        }
      }
    }
    return undefined;
  }

  private flatten(prefix: string, obj: Record<string, any>): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = `${prefix}.${key}`;
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        this.store.set(fullKey, value);
        this.flatten(fullKey, value);
      } else {
        this.store.set(fullKey, value);
      }
    }
  }
}
