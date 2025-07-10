import { cleanResponse } from './utils';
import { buildPrompt } from './prompts';
import { model } from './config';

export const translateLocally = async (input: unknown, lang: string): Promise<unknown> => {
  const formattedPrompt = buildPrompt(input, lang);
  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({ model, prompt: formattedPrompt, stream: false }),
    headers: { 'Content-Type': 'application/json' },
  });

  const result = await res.json();
  return cleanResponse(input, result.response);
};
