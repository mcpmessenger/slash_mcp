import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { zodToJsonSchema } from 'zod-to-json-schema';

process.env.NO_MCP_SERVER = '1';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '..', 'public', 'schemas');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Dynamically import to respect env flag
const { schemas } = await import('../server/index.js');

for (const [method, schema] of Object.entries(schemas)) {
  const json = zodToJsonSchema(schema, method);
  fs.writeFileSync(path.join(outDir, `${method}.json`), JSON.stringify(json, null, 2));
  console.log('wrote', method);
} 