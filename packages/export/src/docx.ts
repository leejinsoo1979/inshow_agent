import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
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
  type ExportResult,
} from './types';

/** DOCX exporter (제안서: 수정 가능한 보고서 산출물) */
export class DocxExporter implements Exporter {
  readonly format = 'docx' as const;

  async export(document: DocumentForExport): Promise<ExportResult> {
    const { sources } = collectSources(document.blocks);
    const children: (Paragraph | Table)[] = [
      new Paragraph({
        heading: HeadingLevel.TITLE,
        children: [new TextRun({ text: document.title })],
      }),
    ];

    for (const block of document.blocks) {
      const c = block.content as Record<string, string | number | undefined>;
      switch (block.type) {
        case 'heading': {
          const level =
            c.level === 1
              ? HeadingLevel.HEADING_1
              : c.level === 2
                ? HeadingLevel.HEADING_2
                : HeadingLevel.HEADING_3;
          children.push(
            new Paragraph({ heading: level, children: [new TextRun(String(c.text ?? ''))] }),
          );
          break;
        }
        case 'paragraph':
          children.push(
            new Paragraph({
              spacing: { after: 160 },
              children: [new TextRun(String(c.text ?? ''))],
            }),
          );
          break;
        case 'image':
          children.push(
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: `[이미지${c.caption ? `: ${c.caption}` : ''}]`,
                  italics: true,
                  color: '71717a',
                }),
              ],
            }),
          );
          break;
        case 'checklist': {
          if (c.title) {
            children.push(
              new Paragraph({ children: [new TextRun({ text: String(c.title), bold: true })] }),
            );
          }
          for (const item of checklistItems(block.content)) {
            children.push(
              new Paragraph({
                children: [new TextRun(`${item.checked ? '☑' : '☐'} ${item.text}`)],
              }),
            );
          }
          children.push(new Paragraph({ children: [] }));
          break;
        }
        case 'table': {
          const table = tableData(block.content);
          if (!table) break;
          if (table.title) {
            children.push(
              new Paragraph({ children: [new TextRun({ text: table.title, bold: true })] }),
            );
          }
          children.push(buildDocxTable(table.headers, table.rows));
          children.push(new Paragraph({ children: [] }));
          break;
        }
        case 'chart': {
          const chart = chartData(block.content);
          if (!chart) break;
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${chart.title ?? '차트'} (${CHART_TYPE_LABELS[chart.chartType] ?? chart.chartType} 차트)`,
                  bold: true,
                }),
              ],
            }),
          );
          const headers = ['항목', ...chart.series.map((s, i) => s.name || `시리즈 ${i + 1}`)];
          const rows = chart.labels.map((label, i) => [
            label,
            ...chart.series.map((s) => String(s.values[i] ?? 0)),
          ]);
          children.push(buildDocxTable(headers, rows));
          children.push(new Paragraph({ children: [] }));
          break;
        }
        case 'formula': {
          const formula = formulaData(block.content);
          if (!formula) break;
          if (formula.title) {
            children.push(
              new Paragraph({ children: [new TextRun({ text: formula.title, bold: true })] }),
            );
          }
          children.push(
            new Paragraph({
              children: [new TextRun({ text: formula.expression, font: 'Courier New' })],
            }),
          );
          for (const v of formula.variables) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun(`· ${v.symbol}: ${v.meaning}${v.unit ? ` (${v.unit})` : ''}`),
                ],
              }),
            );
          }
          if (formula.result) {
            children.push(new Paragraph({ children: [new TextRun(`= ${formula.result}`)] }));
          }
          children.push(new Paragraph({ children: [] }));
          break;
        }
        case 'doc_meta': {
          const entries = docMetaEntries(block.content);
          if (entries.length === 0) break;
          children.push(
            new Paragraph({
              spacing: { after: 160 },
              children: [
                new TextRun({
                  text: entries.map(([k, v]) => `${k}: ${v}`).join('  /  '),
                  color: '52525b',
                  size: 18,
                }),
              ],
            }),
          );
          break;
        }
        case 'qna': {
          const items = qnaItems(block.content);
          if (typeof c.title === 'string' && c.title) {
            children.push(
              new Paragraph({ children: [new TextRun({ text: String(c.title), bold: true })] }),
            );
          }
          for (const item of items) {
            children.push(
              new Paragraph({ children: [new TextRun({ text: `Q. ${item.question}`, bold: true })] }),
            );
            children.push(new Paragraph({ children: [new TextRun(`A. ${item.answer}`)] }));
            if (item.basis) {
              children.push(
                new Paragraph({
                  children: [new TextRun({ text: `근거: ${item.basis}`, color: '71717a' })],
                }),
              );
            }
          }
          children.push(new Paragraph({ children: [] }));
          break;
        }
        case 'cta':
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 160, after: 160 },
              children: [
                new TextRun({
                  text: `▶ ${c.text ?? ''}${c.url ? ` (${c.url})` : ''}`,
                  bold: true,
                }),
              ],
            }),
          );
          break;
        case 'source_reference':
          break;
        default:
          break;
      }
    }

    if (sources.length > 0) {
      children.push(
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('출처')] }),
      );
      sources.forEach((s, i) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun(`${i + 1}. ${s.title ?? '제목 없음'}${s.summary ? ` — ${s.summary}` : ''}`),
            ],
          }),
        );
      });
    }

    const doc = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);
    return {
      filename: safeFilename(document.title, 'docx'),
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      data: new Uint8Array(buffer),
    };
  }
}

function buildDocxTable(headers: string[], rows: string[][]): Table {
  const border = { style: BorderStyle.SINGLE, size: 4, color: 'd4d4d8' };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map(
          (h) =>
            new TableCell({
              borders: { top: border, bottom: border, left: border, right: border },
              shading: { fill: '18181b' },
              children: [
                new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'ffffff' })] }),
              ],
            }),
        ),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: headers.map(
              (_, i) =>
                new TableCell({
                  borders: { top: border, bottom: border, left: border, right: border },
                  children: [new Paragraph({ children: [new TextRun(row[i] ?? '')] })],
                }),
            ),
          }),
      ),
    ],
  });
}
