import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const destination = resolve(root, 'site/public/schema/event.schema.json');
await mkdir(resolve(root, 'site/public/schema'), { recursive: true });
await copyFile(resolve(root, 'schema/event.schema.json'), destination);
