import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import cliProgress from 'cli-progress';
import chalk from 'chalk';

import {
  targetLang, inputPath, outputPath, cacheDir, cachePath, resultsDir, csvPath, MAX_RETRIES
} from './config';

import { TranslationEntry } from './types';
import { loadCache, saveCache } from './cache';
import { makeCacheKey, isSkippable } from './utils';
import { translateLocally } from './translator';
import { exportToCSV } from './csvExporter';

if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
if (resultsDir !== '.' && !existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });

const data: TranslationEntry[] = JSON.parse(readFileSync(inputPath, 'utf-8'));
const cache = loadCache(cachePath);
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
progressBar.start(data.length, 0);

(async () => {
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const key = makeCacheKey(item['Default content']);

    if (cache[key]) {
      item['Translated content'] = cache[key];
    } else if (isSkippable(item['Default content'])) {
      item['Translated content'] = '';
      cache[key] = '';
    } else {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const translated = await translateLocally(item['Default content'], targetLang);
          item['Translated content'] = translated;
          cache[key] = translated;
          saveCache(cachePath, cache);
          break;
        } catch (err: any) {
          console.warn(chalk.yellow(`⚠️ Tentativa ${attempt} falhou para item ${i}: ${err.message || err}`));
          if (attempt === MAX_RETRIES) item['Translated content'] = '';
        }
      }
    }

    progressBar.increment();
  }

  progressBar.stop();
  writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(chalk.green(`✅ Tradução finalizada: ${outputPath}`));

  exportToCSV(data, csvPath);
  console.log(chalk.green(`✅ CSV salvo em: ${csvPath}`));
})();
