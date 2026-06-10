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

export class TxtExporter implements Exporter {
  readonly format = 'txt' as const;

  async export(document: DocumentForExport): Promise<ExportResult> {
    const { sources } = collectSources(document.blocks);
    const lines: string[] = [document.title, '='.repeat(Math.min(document.title.length * 2, 60)), ''];

    for (const block of document.blocks) {
      const c = block.content as Record<string, string | undefined>;
      switch (block.type) {
        case 'heading':
          lines.push('', `${c.text ?? ''}`, '-'.repeat(20));
          break;
        case 'paragraph':
          lines.push(c.text ?? '', '');
          break;
        case 'image':
          lines.push(`[이미지${c.caption ? `: ${c.caption}` : ''}]`, '');
          break;
        case 'checklist': {
          if (c.title) lines.push(`${c.title}`);
          for (const item of checklistItems(block.content)) {
            lines.push(`${item.checked ? '[x]' : '[ ]'} ${item.text}`);
          }
          lines.push('');
          break;
        }
        case 'source_reference':
          // 본문에서는 생략하고 문서 끝 출처 목록으로 변환
          break;
        case 'chart': {
          const chart = chartData(block.content);
          if (!chart) break;
          lines.push(
            `[${CHART_TYPE_LABELS[chart.chartType] ?? chart.chartType} 차트${chart.title ? `: ${chart.title}` : ''}]`,
          );
          chart.labels.forEach((label, i) => {
            const row = chart.series
              .map((s) => `${s.name ? `${s.name} ` : ''}${s.values[i] ?? 0}`)
              .join(' / ');
            lines.push(`- ${label}: ${row}`);
          });
          lines.push('');
          break;
        }
        case 'cta':
          lines.push(`▶ ${c.text ?? ''}${c.url ? ` (${c.url})` : ''}`, '');
          break;
        case 'table': {
          const table = tableData(block.content);
          if (!table) break;
          if (table.title) lines.push(table.title);
          lines.push(table.headers.join(' | '));
          lines.push(table.headers.map(() => '---').join(' | '));
          for (const row of table.rows) {
            lines.push(table.headers.map((_, i) => row[i] ?? '').join(' | '));
          }
          lines.push('');
          break;
        }
        case 'formula': {
          const formula = formulaData(block.content);
          if (!formula) break;
          if (formula.title) lines.push(formula.title);
          lines.push(`  ${formula.expression}`);
          for (const v of formula.variables) {
            lines.push(`  - ${v.symbol}: ${v.meaning}${v.unit ? ` (${v.unit})` : ''}`);
          }
          if (formula.result) lines.push(`  = ${formula.result}`);
          lines.push('');
          break;
        }
        case 'doc_meta': {
          const entries = docMetaEntries(block.content);
          if (entries.length === 0) break;
          lines.push(entries.map(([k, v]) => `${k}: ${v}`).join(' / '), '');
          break;
        }
        case 'qna': {
          const items = qnaItems(block.content);
          if (typeof c.title === 'string' && c.title) lines.push(c.title);
          for (const item of items) {
            lines.push(`Q. ${item.question}`);
            lines.push(`A. ${item.answer}`);
            if (item.basis) lines.push(`   근거: ${item.basis}`);
          }
          lines.push('');
          break;
        }
        case 'law_reference': {
          const law = lawReferenceData(block.content);
          if (!law) break;
          lines.push(`[법규] ${lawReferenceHeading(law)}`);
          if (law.summary) lines.push(law.summary);
          if (law.link) lines.push(`원문: ${law.link}`);
          lines.push('');
          break;
        }
        case 'callout': {
          const callout = calloutData(block.content);
          const variantLabel = CALLOUT_VARIANT_LABELS[callout.variant] ?? callout.variant;
          lines.push(`[${variantLabel}]${callout.title ? ` ${callout.title}` : ''}`);
          lines.push(callout.text, '');
          break;
        }
        case 'quote': {
          const quote = quoteData(block.content);
          lines.push(`"${quote.text}"`);
          if (quote.attribution) lines.push(`— ${quote.attribution}`);
          lines.push('');
          break;
        }
        case 'code': {
          const code = codeData(block.content);
          lines.push(`--- code (${code.language ?? ''}) ---`);
          lines.push(code.code);
          lines.push('--- /code ---', '');
          break;
        }
        case 'cost_table': {
          const cost = costTableData(block.content);
          if (cost.title) lines.push(cost.title);
          lines.push(cost.headers.join(' | '));
          lines.push(cost.headers.map(() => '---').join(' | '));
          for (const row of cost.rows) {
            lines.push(cost.headers.map((_, i) => row[i] ?? '').join(' | '));
          }
          if (cost.note) lines.push(cost.note);
          lines.push('');
          break;
        }
        case 'construction_detail': {
          const detail = constructionDetailData(block.content);
          if (detail.title) lines.push(detail.title);
          if (detail.imageUrl) {
            lines.push(`[상세도: ${detail.imageUrl}]`);
          } else if (detail.imagePrompt) {
            lines.push(`[상세도: ${detail.imagePrompt}]`);
          }
          detail.steps.forEach((step, i) => {
            lines.push(`${i + 1}. ${step}`);
          });
          if (detail.notes) lines.push(`주의: ${detail.notes}`);
          lines.push('');
          break;
        }
        case 'container': {
          if (c.title) lines.push('', `【 ${c.title} 】`, '');
          break;
        }
        default:
          break;
      }
    }

    if (sources.length > 0) {
      lines.push('', '출처', '----');
      sources.forEach((s, i) => {
        lines.push(`${i + 1}. ${s.title ?? '제목 없음'}${s.summary ? ` - ${s.summary}` : ''}`);
      });
    }

    const text = lines.join('\n');
    return {
      filename: safeFilename(document.title, 'txt'),
      mimeType: 'text/plain; charset=utf-8',
      data: new TextEncoder().encode(text),
    };
  }
}
