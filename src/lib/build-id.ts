import fs from 'fs';
import path from 'path';

export function getBuildId(): string {
  try {
    return fs.readFileSync(path.join(process.cwd(), '.next/BUILD_ID'), 'utf8').trim();
  } catch {
    return process.env.BUILD_ID || 'dev';
  }
}
