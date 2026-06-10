import { safeUrlOrEmpty } from '@archi/security';
import {
  CALLOUT_VARIANT_LABELS,
  CHART_TYPE_LABELS,
  calloutData,
  chartData,
  checklistItems,
  codeData,
  collectSources,
  constructionDetailData,
  costTableData,
  docMetaEntries,
  formulaData,
  lawReferenceData,
  lawReferenceHeading,
  qnaItems,
  quoteData,
  safeFilename,
  tableData,
  type DocumentForExport,
  type Exporter,
  type ExportResult,
} from './types';

export class MarkdownExporter implements Exporter {
  readonly format = 'markdown' as const;

  async export(document: DocumentForExport): Promise<ExportResult> {
    const { sources } = collectSources(document.blocks);
    const lines: string[] = [`# ${document.title}`, ''];

    for (const block of document.blocks) {
      const c = block.content as Record<string, string | number | undefined>;
      switch (block.type) {
        case 'heading': {
          const level = Math.min(Number(c.level ?? 2) + 1, 6);
          lines.push(`${'#'.repeat(level)} ${c.text ?? ''}`, '');
          break;
        }
        case 'paragraph':
          lines.push(String(c.text ?? ''), '');
          break;
        case 'image':
          lines.push(`![${c.caption ?? '이미지'}](${safeUrlOrEmpty(String(c.url ?? ''))})`, '');
          if (c.caption) lines.push(`*${c.caption}*`, '');
          break;
        case 'checklist': {
          if (c.title) lines.push(`**${c.title}**`, '');
          for (const item of checklistItems(block.content)) {
            lines.push(`- [${item.checked ? 'x' : ' '}] ${item.text}`);
          }
          lines.push('');
          break;
        }
        case 'source_reference':
          break;
        case 'chart': {
          const chart = chartData(block.content);
          if (!chart) break;
          if (chart.title) {
            lines.push(
              `**${chart.title}** (${CHART_TYPE_LABELS[chart.chartType] ?? chart.chartType} 차트)`,
              '',
            );
          }
          const headers = ['항목', ...chart.series.map((s, i) => s.name || `시리즈 ${i + 1}`)];
          lines.push(`| ${headers.join(' | ')} |`);
          lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
          chart.labels.forEach((label, i) => {
            const cells = [label, ...chart.series.map((s) => String(s.values[i] ?? 0))];
            lines.push(`| ${cells.join(' | ')} |`);
          });
          lines.push('');
          break;
        }
        case 'cta': {
          const ctaUrl = safeUrlOrEmpty(String(c.url ?? '')) || '#';
          const label = c.buttonLabel ? `**[${c.buttonLabel}](${ctaUrl})**` : '';
          lines.push(`> ${c.text ?? ''}`, '>', `> ${label}`.trimEnd(), '');
          break;
        }
        case 'table': {
          const table = tableData(block.content);
          if (!table) break;
          if (table.title) lines.push(`**${table.title}**`, '');
          lines.push(`| ${table.headers.join(' | ')} |`);
          lines.push(`| ${table.headers.map(() => '---').join(' | ')} |`);
          for (const row of table.rows) {
            lines.push(`| ${table.headers.map((_, i) => row[i] ?? '').join(' | ')} |`);
          }
          lines.push('');
          break;
        }
        case 'formula': {
          const formula = formulaData(block.content);
          if (!formula) break;
          if (formula.title) lines.push(`**${formula.title}**`, '');
          lines.push('```', formula.expression, '```');
          for (const v of formula.variables) {
            lines.push(`- \`${v.symbol}\`: ${v.meaning}${v.unit ? ` (${v.unit})` : ''}`);
          }
          if (formula.result) lines.push(`- 결과: ${formula.result}`);
          lines.push('');
          break;
        }
        case 'doc_meta': {
          const entries = docMetaEntries(block.content);
          if (entries.length === 0) break;
          lines.push(`> ${entries.map(([k, v]) => `**${k}** ${v}`).join(' · ')}`, '');
          break;
        }
        case 'qna': {
          const items = qnaItems(block.content);
          if (typeof c.title === 'string' && c.title) lines.push(`**${c.title}**`, '');
          for (const item of items) {
            lines.push(`**Q. ${item.question}**`, '');
            lines.push(`A. ${item.answer}`, '');
            if (item.basis) lines.push(`근거: ${item.basis}`, '');
          }
          break;
        }
        case 'law_reference': {
          const law = lawReferenceData(block.content);
          if (!law) break;
          lines.push(`> **법규** ${lawReferenceHeading(law)}`);
          if (law.summary) lines.push('>', `> ${law.summary}`);
          lines.push('');
          if (law.link) {
            lines.push(`[원문](${safeUrlOrEmpty(law.link)})`, '');
          }
          break;
        }
        case 'callout': {
          const callout = calloutData(block.content);
          const variantLabel = CALLOUT_VARIANT_LABELS[callout.variant] ?? callout.variant;
          const headParts = [`[!${callout.variant.toUpperCase()}]`, variantLabel];
          if (callout.title) headParts.push(callout.title);
          lines.push(`> ${headParts.join(' ')}`, `> ${callout.text}`, '');
          break;
        }
        case 'quote': {
          const quote = quoteData(block.content);
          lines.push(`> ${quote.text}`);
          if (quote.attribution) lines.push('>', `> — ${quote.attribution}`);
          lines.push('');
          break;
        }
        case 'code': {
          const code = codeData(block.content);
          lines.push('```' + (code.language ?? ''), code.code, '```', '');
          break;
        }
        case 'cost_table': {
          const cost = costTableData(block.content);
          if (cost.title) lines.push(`**${cost.title}**`, '');
          lines.push(`| ${cost.headers.join(' | ')} |`);
          lines.push(`| ${cost.headers.map(() => '---').join(' | ')} |`);
          for (const row of cost.rows) {
            lines.push(`| ${cost.headers.map((_, i) => row[i] ?? '').join(' | ')} |`);
          }
          lines.push('');
          if (cost.note) lines.push(cost.note, '');
          break;
        }
        case 'construction_detail': {
          const detail = constructionDetailData(block.content);
          if (detail.title) lines.push(`### ${detail.title}`, '');
          if (detail.imageUrl) {
            lines.push(`![${detail.title ?? '상세도'}](${safeUrlOrEmpty(detail.imageUrl)})`, '');
          } else if (detail.imagePrompt) {
            lines.push(`[상세도: ${detail.imagePrompt}]`, '');
          }
          detail.steps.forEach((step, i) => {
            lines.push(`${i + 1}. ${step}`);
          });
          if (detail.steps.length > 0) lines.push('');
          if (detail.notes) lines.push(`주의: ${detail.notes}`, '');
          break;
        }
        default:
          break;
      }
    }

    if (sources.length > 0) {
      lines.push('## 출처', '');
      sources.forEach((s, i) => {
        lines.push(`${i + 1}. **${s.title ?? '제목 없음'}**${s.summary ? ` — ${s.summary}` : ''}`);
      });
      lines.push('');
    }

    return {
      filename: safeFilename(document.title, 'md'),
      mimeType: 'text/markdown; charset=utf-8',
      data: new TextEncoder().encode(lines.join('\n')),
    };
  }
}
