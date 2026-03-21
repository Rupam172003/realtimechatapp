import { execSync } from 'child_process';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const lines = envFile.split('\n');

for (const line of lines) {
  if (line && line.includes('=') && !line.startsWith('PORT')) {
    const [key, ...values] = line.split('=');
    const value = values.join('=').trim();
    if (key && value) {
      console.log(`Adding ${key}...`);
      try {
        execSync(`npx vercel env add ${key} production`, { input: value, stdio: ['pipe', 'inherit', 'inherit'] });
        execSync(`npx vercel env add ${key} preview`, { input: value, stdio: ['pipe', 'inherit', 'inherit'] });
        execSync(`npx vercel env add ${key} development`, { input: value, stdio: ['pipe', 'inherit', 'inherit'] });
      } catch (e) {
        console.error(`Failed to add ${key}:`, e.message);
      }
    }
  }
}
