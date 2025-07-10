import { TranslationEntry } from './types';
import { serializeCSVField } from './utils';
import { writeFileSync } from 'fs';

export const exportToCSV = (data: TranslationEntry[], path: string) => {
  const header = 'Type,Identification,Field,Locale,Market,Status,Default content,Translated content';
  const lines = [header];

  for (const entry of data) {
    const row = [
      entry.Type,
      entry.Identification,
      entry.Field,
      entry.Locale,
      entry.Market || '',
      entry.Status || '',
      serializeCSVField(entry['Default content']),
      serializeCSVField(entry['Translated content']),
    ].join(',');
    lines.push(row);
  }

  writeFileSync(path, lines.join('\n'), 'utf-8');
};
