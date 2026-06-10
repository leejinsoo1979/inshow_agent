export * from './types';
export * from './txt';
export * from './markdown';
export * from './pdf';

import type { Exporter, ExportFormat } from './types';
import { TxtExporter } from './txt';
import { MarkdownExporter } from './markdown';
import { PdfExporter } from './pdf';

export function getExporter(format: ExportFormat): Exporter {
  switch (format) {
    case 'txt':
      return new TxtExporter();
    case 'markdown':
      return new MarkdownExporter();
    case 'pdf':
      return new PdfExporter();
  }
}
