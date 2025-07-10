export const makeCacheKey = (val: unknown): string => JSON.stringify(val);

export const isSkippable = (val: unknown): boolean => {
  if (!val) return true;
  if (typeof val === 'string') {
    return val.startsWith('gid://') || val.startsWith('shopify://') || val.includes('cdn.shopify.com');
  }
  if (Array.isArray(val)) {
    return val.every((v) => typeof v === 'string' && (v.startsWith('gid://') || v.startsWith('shopify://')));
  }
  return false;
};

export const serializeCSVField = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
  return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
};

export const cleanResponse = (input: unknown, response: string): unknown => {
  const trimmed = response.trim();
  const containsComments = /mantive|tradu[çc][aã]o|explica[çc][aã]o|não existe necessidade/i.test(trimmed);

  if (containsComments) return input;

  if (typeof input === 'string' && /^".*"$/.test(trimmed)) {
    return trimmed.slice(1, -1);
  }

  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      console.warn('⚠️ Falha ao fazer parse de resposta como JSON.');
    }
  }

  return trimmed;
};

