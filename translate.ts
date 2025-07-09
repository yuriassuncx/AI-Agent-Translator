// translate.ts
import { Agent, run } from '@openai/agents';
import { config } from 'dotenv';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import cliProgress from 'cli-progress';
import chalk from 'chalk';
import languages from './languages.json';

config();

// ==== Verifica se a chave da OpenAI está presente ====
if (!process.env.OPENAI_API_KEY) {
  console.error(chalk.red('❌ Variável OPENAI_API_KEY não encontrada no ambiente.'));
  process.exit(1);
} else {
  console.log(chalk.green('✅ OPENAI_API_KEY carregada com sucesso.'));
}

// ==== CLI ARGS ====
const args = process.argv.slice(2);
const getArg = (key: string, fallback?: string) => {
  const found = args.find((a) => a.startsWith(`${key}=`));
  return found ? found.split('=')[1] : fallback;
};

const targetLang = getArg('--lang', 'pt-PT')!;
const model = getArg('--model', 'gpt-4')!;
const inputPath = getArg('--input', 'input.json')!;
const outputPath = getArg('--output', 'translated.json')!;
const CHUNK_SIZE = 10;
const CACHE_PATH = 'cache.json';
const LAST_RESPONSE_PATH = 'last-response.json';
const MAX_RETRIES = 2;

if (!languages[targetLang]) {
  console.error(chalk.red(`❌ Idioma não suportado: ${targetLang}`));
  process.exit(1);
}

interface TranslationEntry {
  Type: string;
  Identification: string;
  Field: string;
  Locale: string;
  Market: string;
  Status: string;
  'Default content': unknown;
  'Translated content': unknown;
}

const loadCache = (): Record<string, unknown> => {
  try {
    return existsSync(CACHE_PATH)
      ? JSON.parse(readFileSync(CACHE_PATH, 'utf-8'))
      : {};
  } catch {
    return {};
  }
};

const saveCache = (cache: Record<string, unknown>) => {
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
};

const makeCacheKey = (value: unknown): string => {
  return JSON.stringify(value);
};

const translatorAgent = new Agent({
  name: 'json-translator',
  model,
  instructions: `
Você é um tradutor especializado em arquivos JSON estruturados exportados do Shopify Translate & Adapt. Siga as regras abaixo com exatidão.

REGRAS OBRIGATÓRIAS:

1. Traduza apenas os valores textuais legíveis por humanos presentes na chave "Default content" de cada item.
2. Nunca modifique ou confunda o campo "Default content". Ele deve permanecer exatamente como está. A tradução deve ser inserida somente no campo "Translated content".
3. Preserve totalmente a estrutura JSON, incluindo objetos, arrays, tipos, identificadores e demais chaves.

Traduza apenas:
- Strings dentro da propriedade "Default content".
- Se o conteúdo for um array ou objeto, apenas traduza os valores das chaves:
  - value
  - text
  - label
  - title (se for textual e não um identificador)

Não traduza:
- Códigos Liquid: {{ ... }}, {% ... %}
- HTML: Preserve tags e estrutura.
- Identificadores como: gid://..., shopify://... Ou arrays contendo esses identificadores.
- URLs, e-mails, handles e qualquer string técnica.
- Chaves como type, listType, children, Field, Identification, etc. Se houver children, traduza apenas os valores "value" deles.

Se um campo já estiver em português ou for igual ao original, copie o conteúdo para "Translated content".

Formato de saída: Um JSON completo, exatamente igual ao original, com os campos "Translated content" preenchidos com a tradução correta.
`.trim(),
});

const data: TranslationEntry[] = JSON.parse(readFileSync(inputPath, 'utf-8'));
const cache = loadCache();
const translatedChunks: TranslationEntry[] = [];
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
progressBar.start(data.length, 0);

for (let i = 0; i < data.length; i += CHUNK_SIZE) {
  const chunk = data.slice(i, i + CHUNK_SIZE);
  const uncached = chunk.filter((item) => {
    const key = makeCacheKey(item['Default content']);
    return !cache[key];
  });

  if (uncached.length === 0) {
    for (const item of chunk) {
      item['Translated content'] = cache[makeCacheKey(item['Default content'])];
    }
    translatedChunks.push(...chunk);
    progressBar.update(Math.min(i + CHUNK_SIZE, data.length));
    continue;
  }

  console.log(chalk.gray(`🔍 Traduzindo bloco de ${uncached.length} itens...`));

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const prompt = `Traduza o seguinte bloco:\n\n${JSON.stringify(uncached, null, 2)}`;
      const response = await run(translatorAgent, prompt);

      if (typeof response.finalOutput !== 'string') {
        throw new Error('Resposta inesperada do agente');
      }

      writeFileSync(LAST_RESPONSE_PATH, response.finalOutput);

      let translated: TranslationEntry[];

      try {
        translated = JSON.parse(response.finalOutput);
      } catch (jsonErr) {
        console.error(chalk.red('❌ Erro ao fazer parse do JSON retornado. Veja last-response.json.'));
        throw jsonErr;
      }

      for (let j = 0; j < uncached.length; j++) {
        const key = makeCacheKey(uncached[j]['Default content']);
        const translatedText = translated[j]?.['Translated content'];
        if (translatedText !== undefined) {
          cache[key] = translatedText;
          uncached[j]['Translated content'] = translatedText;
        }
      }

      saveCache(cache);

      for (const item of chunk) {
        const key = makeCacheKey(item['Default content']);
        if (cache[key]) {
          item['Translated content'] = cache[key];
        }
      }

      translatedChunks.push(...chunk);
      progressBar.update(Math.min(i + CHUNK_SIZE, data.length));
      break;
    } catch (err: any) {
      console.warn(chalk.yellow(`⚠️ Tentativa ${attempt} falhou: ${err.message || err}`));
      if (attempt === MAX_RETRIES) {
        console.error(chalk.red('❌ Todas as tentativas falharam para este bloco. Pulando...'));
      }
    }
  }
}

progressBar.stop();
writeFileSync(outputPath, JSON.stringify(translatedChunks, null, 2));
console.log(chalk.green(`\n✅ Tradução finalizada com sucesso: ${outputPath}`));
