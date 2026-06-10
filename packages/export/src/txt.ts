import {
  CHART_TYPE_LABELS,
  chartData,
  checklistItems,
  collectSources,
  safeFilename,
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
