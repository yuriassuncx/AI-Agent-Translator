import { join, dirname, basename } from 'path';
import languages from '../languages/languages.json';

const args = process.argv.slice(2);
const getArg = (key: string, fallback: string): string => {
  const found = args.find((a) => a.startsWith(`${key}=`));
  const result = found ? found.split('=')[1] : fallback;
  if (!result) throw new Error(`❌ Argumento obrigatório ausente: ${key}`);
  return result;
};

export const targetLang = getArg('--lang', 'pt-PT');
export const inputPath = getArg('--input', 'input.json');
const rawOutput = getArg('--output', `${targetLang}.json`);
export const outputPath = rawOutput.includes('/') || rawOutput.includes('\\') ? rawOutput : join('results', rawOutput);
export const model = getArg('--model', 'mistral');

export const cacheDir = 'cache';
export const cachePath = join(cacheDir, `${targetLang}.json`);
export const resultsDir = dirname(outputPath);
export const csvPath = join('results', `${basename(outputPath, '.json')}.csv`);
export const MAX_RETRIES = 2;

if (!languages[targetLang]) {
  console.error(`❌ Idioma não suportado: ${targetLang}`);
  process.exit(1);
}
