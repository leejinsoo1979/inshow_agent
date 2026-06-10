import { safeUrlOrEmpty } from '@archi/security';
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
