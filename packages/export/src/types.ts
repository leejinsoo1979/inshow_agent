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

export type ExportFormat = 'txt' | 'markdown' | 'pdf';

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
