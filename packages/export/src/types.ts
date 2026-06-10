/** Export Adapter 인터페이스 (ARCHITECTURE.md 6.4) */

export type ExportBlock = {
  id: string;
  type: string;
  sortOrder: number;
  content: Record<string, unknown>;
};

export type DocumentForExport = {
  id: string;
  title: string;
  blocks: ExportBlock[];
};

export type ExportFormat = 'txt' | 'markdown' | 'pdf' | 'docx' | 'html';

export type ExportOptions = {
  /** PDF 한글 렌더링용 폰트 바이트 (호출자가 주입) */
  fontBytes?: Uint8Array;
};

export type ExportResult = {
  filename: string;
  mimeType: string;
  data: Uint8Array;
};

export interface Exporter {
  readonly format: ExportFormat;
  export(document: DocumentForExport, options?: ExportOptions): Promise<ExportResult>;
}

/** 파일명에 쓸 수 없는 문자 제거 */
export function safeFilename(title: string, ext: string): string {
  const base = title.replace(/[\\/:*?"<>|\n\r]+/g, ' ').trim().slice(0, 80) || 'document';
  return `${base}.${ext}`;
}

type SourceRefContent = { title?: string; summary?: string; citations?: string[] };
type ChecklistItem = { text: string; checked: boolean };

/** 블록들을 공용 중간 표현으로 변환하며 출처 목록을 분리 수집한다 */
export function collectSources(blocks: ExportBlock[]): {
  bodyBlocks: ExportBlock[];
  sources: SourceRefContent[];
} {
  const sources: SourceRefContent[] = [];
  for (const block of blocks) {
    if (block.type === 'source_reference') {
      sources.push(block.content as SourceRefContent);
    }
  }
  return { bodyBlocks: blocks, sources };
}

export function checklistItems(content: Record<string, unknown>): ChecklistItem[] {
  return Array.isArray(content.items) ? (content.items as ChecklistItem[]) : [];
}

export type ChartData = {
  chartType: string;
  title?: string;
  labels: string[];
  series: { name?: string; values: number[] }[];
};

export function chartData(content: Record<string, unknown>): ChartData | null {
  const labels = Array.isArray(content.labels) ? (content.labels as string[]) : [];
  const series = Array.isArray(content.series)
    ? (content.series as { name?: string; values: number[] }[])
    : [];
  if (labels.length === 0 || series.length === 0) return null;
  return {
    chartType: String(content.chartType ?? 'bar'),
    title: typeof content.title === 'string' ? content.title : undefined,
    labels,
    series,
  };
}

export const CHART_TYPE_LABELS: Record<string, string> = {
  bar: '막대',
  line: '선',
  pie: '파이',
};

export type TableData = { title?: string; headers: string[]; rows: string[][] };

export function tableData(content: Record<string, unknown>): TableData | null {
  const headers = Array.isArray(content.headers) ? (content.headers as string[]) : [];
  const rows = Array.isArray(content.rows) ? (content.rows as string[][]) : [];
  if (headers.length === 0) return null;
  return {
    title: typeof content.title === 'string' ? content.title : undefined,
    headers,
    rows,
  };
}

export type FormulaData = {
  title?: string;
  expression: string;
  variables: { symbol: string; meaning: string; unit?: string }[];
  result?: string;
};

export function formulaData(content: Record<string, unknown>): FormulaData | null {
  if (typeof content.expression !== 'string' || !content.expression) return null;
  return {
    title: typeof content.title === 'string' ? content.title : undefined,
    expression: content.expression,
    variables: Array.isArray(content.variables)
      ? (content.variables as FormulaData['variables'])
      : [],
    result: typeof content.result === 'string' && content.result ? content.result : undefined,
  };
}

export type DocMetaData = {
  docCode?: string;
  version?: string;
  author?: string;
  publishedAt?: string;
  reviewStatus?: string;
};

export const REVIEW_STATUS_LABELS: Record<string, string> = {
  draft: '작성 중',
  review: '검수 대기',
  approved: '검수 완료',
};

export function docMetaEntries(content: Record<string, unknown>): [string, string][] {
  const c = content as DocMetaData;
  const entries: [string, string][] = [];
  if (c.docCode) entries.push(['문서코드', c.docCode]);
  if (c.version) entries.push(['버전', c.version]);
  if (c.author) entries.push(['작성자', c.author]);
  if (c.publishedAt) entries.push(['발행일', c.publishedAt]);
  if (c.reviewStatus) {
    entries.push(['검수 상태', REVIEW_STATUS_LABELS[c.reviewStatus] ?? c.reviewStatus]);
  }
  return entries;
}

export type QnaItem = { question: string; answer: string; basis?: string };

export function qnaItems(content: Record<string, unknown>): QnaItem[] {
  return Array.isArray(content.items) ? (content.items as QnaItem[]) : [];
}
