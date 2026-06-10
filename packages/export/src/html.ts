import { safeUrlOrEmpty } from '@archi/security';
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

function esc(text: unknown): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** HTML exporter (제안서: 홈페이지/랜딩페이지 배포). 모든 사용자 입력은 escape, URL은 allowlist */
export class HtmlExporter implements Exporter {
  readonly format = 'html' as const;

  async export(document: DocumentForExport): Promise<ExportResult> {
    const { sources } = collectSources(document.blocks);
    const parts: string[] = [`<h1>${esc(document.title)}</h1>`];

    for (const block of document.blocks) {
      const c = block.content as Record<string, string | number | undefined>;
      switch (block.type) {
        case 'heading': {
          const level = Math.min(Number(c.level ?? 2) + 1, 6);
          parts.push(`<h${level}>${esc(c.text)}</h${level}>`);
          break;
        }
        case 'paragraph':
          parts.push(`<p>${esc(c.text)}</p>`);
          break;
        case 'image': {
          const url = safeUrlOrEmpty(String(c.url ?? ''));
          if (url) {
            parts.push(
              `<figure><img src="${esc(url)}" alt="${esc(c.caption ?? '이미지')}"/>${
                c.caption ? `<figcaption>${esc(c.caption)}</figcaption>` : ''
              }</figure>`,
            );
          }
          break;
        }
        case 'checklist': {
          const items = checklistItems(block.content);
          const title = c.title ? `<p class="list-title">${esc(c.title)}</p>` : '';
          parts.push(
            `${title}<ul class="checklist">${items
              .map((item) => `<li>${item.checked ? '☑' : '☐'} ${esc(item.text)}</li>`)
              .join('')}</ul>`,
          );
          break;
        }
        case 'table': {
          const table = tableData(block.content);
          if (!table) break;
          parts.push(renderHtmlTable(table.title, table.headers, table.rows));
          break;
        }
        case 'chart': {
          const chart = chartData(block.content);
          if (!chart) break;
          const headers = ['항목', ...chart.series.map((s, i) => s.name || `시리즈 ${i + 1}`)];
          const rows = chart.labels.map((label, i) => [
            label,
            ...chart.series.map((s) => String(s.values[i] ?? 0)),
          ]);
          parts.push(
            renderHtmlTable(
              `${chart.title ?? '차트'} (${CHART_TYPE_LABELS[chart.chartType] ?? chart.chartType} 차트)`,
              headers,
              rows,
            ),
          );
          break;
        }
        case 'formula': {
          const formula = formulaData(block.content);
          if (!formula) break;
          const vars = formula.variables
            .map((v) => `<li><code>${esc(v.symbol)}</code>: ${esc(v.meaning)}${v.unit ? ` (${esc(v.unit)})` : ''}</li>`)
            .join('');
          parts.push(
            `<div class="formula">${formula.title ? `<p class="list-title">${esc(formula.title)}</p>` : ''}<pre><code>${esc(formula.expression)}</code></pre>${vars ? `<ul>${vars}</ul>` : ''}${formula.result ? `<p>= ${esc(formula.result)}</p>` : ''}</div>`,
          );
          break;
        }
        case 'doc_meta': {
          const entries = docMetaEntries(block.content);
          if (entries.length === 0) break;
          parts.push(
            `<p class="doc-meta">${entries.map(([k, v]) => `<strong>${esc(k)}</strong> ${esc(v)}`).join(' · ')}</p>`,
          );
          break;
        }
        case 'qna': {
          const items = qnaItems(block.content);
          const title = c.title ? `<p class="list-title">${esc(c.title)}</p>` : '';
          parts.push(
            `${title}<dl class="qna">${items
              .map(
                (item) =>
                  `<dt>Q. ${esc(item.question)}</dt><dd>A. ${esc(item.answer)}${item.basis ? `<br/><small>근거: ${esc(item.basis)}</small>` : ''}</dd>`,
              )
              .join('')}</dl>`,
          );
          break;
        }
        case 'cta': {
          const url = safeUrlOrEmpty(String(c.url ?? ''));
          parts.push(
            `<div class="cta"><p>${esc(c.text)}</p>${
              c.buttonLabel ? `<a href="${esc(url || '#')}">${esc(c.buttonLabel)}</a>` : ''
            }</div>`,
          );
          break;
        }
        case 'source_reference':
          break;
        default:
          break;
      }
    }

    if (sources.length > 0) {
      parts.push('<h2>출처</h2>');
      parts.push(
        `<ol class="sources">${sources
          .map((s) => `<li><strong>${esc(s.title ?? '제목 없음')}</strong>${s.summary ? ` — ${esc(s.summary)}` : ''}</li>`)
          .join('')}</ol>`,
      );
    }

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(document.title)}</title>
<style>
  body { font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; color: #18181b; max-width: 760px; margin: 0 auto; padding: 48px 24px; line-height: 1.7; }
  h1, h2, h3, h4 { line-height: 1.3; }
  img { max-width: 100%; border-radius: 8px; }
  figcaption { color: #71717a; font-size: 0.85rem; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 0.95rem; }
  th { background: #18181b; color: #fff; text-align: left; }
  th, td { border: 1px solid #d4d4d8; padding: 6px 10px; }
  .checklist { list-style: none; padding-left: 0; }
  .formula pre { background: #18181b; color: #fff; padding: 10px 14px; border-radius: 8px; }
  .doc-meta { color: #52525b; font-size: 0.85rem; border-left: 3px solid #18181b; padding-left: 10px; }
  .qna dt { font-weight: 700; margin-top: 10px; }
  .qna dd { margin-left: 0; color: #3f3f46; }
  .cta { background: #18181b; color: #fff; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
  .cta a { display: inline-block; background: #fff; color: #18181b; padding: 8px 18px; border-radius: 8px; text-decoration: none; font-weight: 700; }
  .list-title { font-weight: 700; }
</style>
</head>
<body>
${parts.join('\n')}
</body>
</html>`;

    return {
      filename: safeFilename(document.title, 'html'),
      mimeType: 'text/html; charset=utf-8',
      data: new TextEncoder().encode(html),
    };
  }
}

function renderHtmlTable(title: string | undefined, headers: string[], rows: string[][]): string {
  const head = `<tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>`;
  const body = rows
    .map((row) => `<tr>${headers.map((_, i) => `<td>${esc(row[i] ?? '')}</td>`).join('')}</tr>`)
    .join('');
  return `${title ? `<p class="list-title">${esc(title)}</p>` : ''}<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
}
