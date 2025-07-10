import { readFileSync, writeFileSync, existsSync } from 'fs';

export const loadCache = (path: string): Record<string, unknown> => {
  try {
    return existsSync(path) ? JSON.parse(readFileSync(path, 'utf-8')) : {};
  } catch {
    return {};
  }
};

export const saveCache = (path: string, cache: Record<string, unknown>) => {
  writeFileSync(path, JSON.stringify(cache, null, 2));
};
