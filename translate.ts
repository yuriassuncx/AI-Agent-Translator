import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import cliProgress from 'cli-progress';
import chalk from 'chalk';
import languages from './languages/languages.json';

// ==== CLI ARGS ====
const args = process.argv.slice(2);
const getArg = (key: string, fallback: string): string => {
  const found = args.find((a) => a.startsWith(`${key}=`));
  const result = found ? found.split('=')[1] : fallback;
  if (!result) {
    throw new Error(`❌ Argumento obrigatório ausente: ${key}`);
  }
  return result;
};

const targetLang = getArg('--lang', 'pt-PT');
const inputPath = getArg('--input', 'input.json');

// Garante que output está dentro de results/ com nome padrão targetLang.json
const rawOutput = getArg('--output', `${targetLang}.json`);
const outputPath = rawOutput.includes('/') || rawOutput.includes('\\')
  ? rawOutput
  : join('results', rawOutput);

const model = getArg('--model', 'mistral');

const cacheDir = 'cache';
const cachePath = join(cacheDir, `${targetLang}.json`);
const resultsDir = dirname(outputPath);
const MAX_RETRIES = 2;

if (!languages[targetLang]) {
  console.error(chalk.red(`❌ Idioma não suportado: ${targetLang}`));
  process.exit(1);
}

if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
if (resultsDir !== '.' && !existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });

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
    return existsSync(cachePath)
      ? JSON.parse(readFileSync(cachePath, 'utf-8'))
      : {};
  } catch {
    return {};
  }
};

const saveCache = (cache: Record<string, unknown>) => {
  writeFileSync(cachePath, JSON.stringify(cache, null, 2));
};

const makeCacheKey = (value: unknown): string => {
  return JSON.stringify(value);
};

const isSkippable = (val: unknown): boolean => {
  if (!val) return true;
  if (typeof val === 'string') {
    return val.startsWith('gid://') || val.startsWith('shopify://') || val.includes('cdn.shopify.com');
  }
  if (Array.isArray(val)) {
    return val.every((v) => typeof v === 'string' && (v.startsWith('gid://') || v.startsWith('shopify://')));
  }
  return false;
};

const cleanResponse = (input: unknown, response: string): unknown => {
  const trimmed = response.trim();

  // Rejeita comentários e explicações
  const containsComentario = /mantive|tradu[çc][aã]o|explica[çc][aã]o|não existe necessidade/i.test(trimmed);
  if (containsComentario) return input;

  // Remove aspas duplicadas de string simples
  if (typeof input === 'string' && /^".*"$/.test(trimmed)) {
    return trimmed.slice(1, -1);
  }

  // Corrige objetos ou arrays retornados como string
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      console.warn(chalk.yellow('⚠️ Falha ao fazer parse de resposta como JSON.'));
    }
  }

  return trimmed;
};

const translateLocally = async (input: unknown): Promise<unknown> => {
  const formattedPrompt = `Você é um sistema automático de tradução de dados da plataforma Shopify para a Zeedog, ecommerce focado em produtos para cães e gatos. Sua única função é traduzir **somente** o conteúdo textual humano, mantendo 100% da estrutura original dos dados.

  IMPORTANTE: você deve retornar exatamente o mesmo tipo de valor que recebeu (string, array, objeto). NUNCA escreva explicações, comentários ou justificativas.

  REGRAS ESTRITAS:
  - Nunca altere o tipo dos dados (string, array, objeto).
  - Nunca adicione nem remova chaves, campos ou posições.
  - Nunca serialize conteúdo como string (ex: não envolva objetos/arrays em aspas).
  - Preserve a capitalização exatamente como no conteúdo original.
  - Nunca traduza valores técnicos como:
    - URLs
    - Emails
    - Identificadores (ex: gid://)
    - Tags Liquid: {{ ... }}, {% ... %}
    - HTML (sem alterar tags, espaços ou quebras)
    - Valores como "true", "false", "SKU", "px", etc. → mantenha exatamente como está.

  Proibido:
  - Criar textos novos
  - Adicionar comentários
  - Explicar ou justificar traduções
  - Alterar estrutura, indentação, ou formatação

  Exemplos:
  - "title": "Collars" → "Colares"
  - "text": "<p>Hello World</p>" → "<p>Olá Mundo</p>"
  - ["s", "m", "l"] → ["p", "m", "g"] (identificar idioma e traduzir tamanhos se for necessário, mas manter a mesma estrutura)

  Idioma de destino: ${targetLang}

  Conteúdo a ser traduzido (retorne apenas o valor, no mesmo formato, evite explicações ou comentários):

  ${JSON.stringify(input, null, 2)}
  `;

  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      model,
      prompt: formattedPrompt,
      stream: false,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const result = await res.json();
  return cleanResponse(input, result.response);
};

const data: TranslationEntry[] = JSON.parse(readFileSync(inputPath, 'utf-8'));
const cache = loadCache();
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
progressBar.start(data.length, 0);

(async () => {
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const key = makeCacheKey(item['Default content']);

    if (cache[key]) {
      item['Translated content'] = cache[key];
      progressBar.increment();
      continue;
    }

    if (isSkippable(item['Default content'])) {
      item['Translated content'] = '';
      cache[key] = '';
      progressBar.increment();
      continue;
    }

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const translated = await translateLocally(item['Default content']);
        item['Translated content'] = translated;
        cache[key] = translated;
        saveCache(cache);
        break;
      } catch (err: any) {
        console.warn(chalk.yellow(`⚠️ Tentativa ${attempt} falhou para item ${i}: ${err.message || err}`));
        if (attempt === MAX_RETRIES) {
          item['Translated content'] = '';
        }
      }
    }

    progressBar.increment();
  }

  progressBar.stop();
  writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(chalk.green(`\n✅ Tradução finalizada com sucesso: ${outputPath}`));
})();
