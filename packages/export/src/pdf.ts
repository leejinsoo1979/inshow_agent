import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {
  CHART_TYPE_LABELS,
  chartData,
  checklistItems,
  collectSources,
  docMetaEntries,
  formulaData,
  qnaItems,
  safeFilename,
  tableData,
  type DocumentForExport,
  type Exporter,
  type ExportOptions,
  type ExportResult,
} from './types';

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const BODY_SIZE = 11;
const LINE_HEIGHT = 18;

/**
 * PDF exporter. 서버에서 블록을 직접 렌더링한다 (Chromium 불필요).
 * 한글 렌더링을 위해 options.fontBytes(Noto Sans KR 등) 주입이 필요하다.
 */
export class PdfExporter implements Exporter {
  readonly format = 'pdf' as const;

  async export(document: DocumentForExport, options?: ExportOptions): Promise<ExportResult> {
    const pdf = await PDFDocument.create();
    let font: PDFFont;
    if (options?.fontBytes) {
      pdf.registerFontkit(fontkit);
      font = await pdf.embedFont(options.fontBytes, { subset: true });
    } else {
      font = await pdf.embedFont('Helvetica');
    }

    const writer = new PageWriter(pdf, font);
    writer.writeText(document.title, { size: 20, gapAfter: 14 });

    const { sources } = collectSources(document.blocks);

    for (const block of document.blocks) {
      const c = block.content as Record<string, string | number | undefined>;
      switch (block.type) {
        case 'heading': {
          const size = c.level === 1 ? 16 : c.level === 2 ? 14 : 12;
          writer.writeText(String(c.text ?? ''), { size, gapBefore: 8, gapAfter: 6 });
          break;
        }
        case 'paragraph':
          writer.writeText(String(c.text ?? ''), { gapAfter: 8 });
          break;
        case 'image':
          writer.writeText(`[이미지${c.caption ? `: ${c.caption}` : ''}]`, {
            gapAfter: 8,
            color: rgb(0.45, 0.45, 0.5),
          });
          break;
        case 'checklist': {
          if (c.title) writer.writeText(String(c.title), { size: 12, gapAfter: 4 });
          for (const item of checklistItems(block.content)) {
            writer.writeText(`${item.checked ? '☑' : '☐'} ${item.text}`, { gapAfter: 2 });
          }
          writer.gap(6);
          break;
        }
        case 'source_reference':
          break;
        case 'chart': {
          const chart = chartData(block.content);
          if (!chart) break;
          writer.writeText(
            `[${CHART_TYPE_LABELS[chart.chartType] ?? chart.chartType} 차트${chart.title ? `: ${chart.title}` : ''}]`,
            { size: 12, gapBefore: 6, gapAfter: 4 },
          );
          chart.labels.forEach((label, i) => {
            const row = chart.series
              .map((s) => `${s.name ? `${s.name} ` : ''}${s.values[i] ?? 0}`)
              .join(' / ');
            writer.writeText(`· ${label}: ${row}`, { gapAfter: 2 });
          });
          writer.gap(6);
          break;
        }
        case 'cta':
          writer.writeText(`▶ ${c.text ?? ''}${c.url ? ` (${c.url})` : ''}`, {
            gapBefore: 6,
            gapAfter: 8,
          });
          break;
        case 'table': {
          const table = tableData(block.content);
          if (!table) break;
          if (table.title) writer.writeText(table.title, { size: 12, gapBefore: 6, gapAfter: 4 });
          writer.writeText(table.headers.join('  |  '), { gapAfter: 2 });
          for (const row of table.rows) {
            writer.writeText(table.headers.map((_, i) => row[i] ?? '').join('  |  '), {
              gapAfter: 2,
              color: rgb(0.25, 0.25, 0.28),
            });
          }
          writer.gap(6);
          break;
        }
        case 'formula': {
          const formula = formulaData(block.content);
          if (!formula) break;
          if (formula.title) {
            writer.writeText(formula.title, { size: 12, gapBefore: 6, gapAfter: 4 });
          }
          writer.writeText(formula.expression, { gapAfter: 3 });
          for (const v of formula.variables) {
            writer.writeText(`· ${v.symbol}: ${v.meaning}${v.unit ? ` (${v.unit})` : ''}`, {
              gapAfter: 2,
              color: rgb(0.35, 0.35, 0.4),
            });
          }
          if (formula.result) writer.writeText(`= ${formula.result}`, { gapAfter: 4 });
          writer.gap(4);
          break;
        }
        case 'doc_meta': {
          const entries = docMetaEntries(block.content);
          if (entries.length === 0) break;
          writer.writeText(entries.map(([k, v]) => `${k}: ${v}`).join('  /  '), {
            gapAfter: 8,
            color: rgb(0.4, 0.4, 0.45),
          });
          break;
        }
        case 'qna': {
          const items = qnaItems(block.content);
          if (typeof c.title === 'string' && c.title) {
            writer.writeText(String(c.title), { size: 12, gapBefore: 6, gapAfter: 4 });
          }
          for (const item of items) {
            writer.writeText(`Q. ${item.question}`, { gapAfter: 2 });
            writer.writeText(`A. ${item.answer}`, { gapAfter: 2, color: rgb(0.3, 0.3, 0.35) });
            if (item.basis) {
              writer.writeText(`근거: ${item.basis}`, { gapAfter: 3, color: rgb(0.45, 0.45, 0.5) });
            }
          }
          writer.gap(4);
          break;
        }
        default:
          break;
      }
    }

    if (sources.length > 0) {
      writer.writeText('출처', { size: 14, gapBefore: 12, gapAfter: 6 });
      sources.forEach((s, i) => {
        writer.writeText(
          `${i + 1}. ${s.title ?? '제목 없음'}${s.summary ? ` - ${s.summary}` : ''}`,
          { gapAfter: 4 },
        );
      });
    }

    const bytes = await pdf.save();
    return {
      filename: safeFilename(document.title, 'pdf'),
      mimeType: 'application/pdf',
      data: bytes,
    };
  }
}

class PageWriter {
  private page: PDFPage;
  private y: number;

  constructor(
    private pdf: PDFDocument,
    private font: PDFFont,
  ) {
    this.page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  gap(amount: number) {
    this.y -= amount;
  }

  writeText(
    text: string,
    opts?: { size?: number; gapBefore?: number; gapAfter?: number; color?: ReturnType<typeof rgb> },
  ) {
    const size = opts?.size ?? BODY_SIZE;
    if (opts?.gapBefore) this.gap(opts.gapBefore);
    const maxWidth = PAGE_WIDTH - MARGIN * 2;
    for (const line of this.wrap(text, size, maxWidth)) {
      const lineHeight = Math.max(LINE_HEIGHT, size * 1.5);
      if (this.y - lineHeight < MARGIN) {
        this.page = this.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        this.y = PAGE_HEIGHT - MARGIN;
      }
      this.page.drawText(line, {
        x: MARGIN,
        y: this.y - lineHeight,
        size,
        font: this.font,
        color: opts?.color ?? rgb(0.1, 0.1, 0.12),
      });
      this.y -= lineHeight;
    }
    if (opts?.gapAfter) this.gap(opts.gapAfter);
  }

  /** 한글은 공백 단위 분리가 어려워 글자 단위 폭 기준으로 줄바꿈한다 */
  private wrap(text: string, size: number, maxWidth: number): string[] {
    const lines: string[] = [];
    let current = '';
    for (const char of text.replace(/\r/g, '')) {
      if (char === '\n') {
        lines.push(current);
        current = '';
        continue;
      }
      const candidate = current + char;
      let width: number;
      try {
        width = this.font.widthOfTextAtSize(candidate, size);
      } catch {
        // 폰트에 없는 글자는 대체 문자로
        current += '?';
        continue;
      }
      if (width > maxWidth && current.length > 0) {
        lines.push(current);
        current = char;
      } else {
        current = candidate;
      }
    }
    if (current.length > 0) lines.push(current);
    return lines.length > 0 ? lines : [''];
  }
}
