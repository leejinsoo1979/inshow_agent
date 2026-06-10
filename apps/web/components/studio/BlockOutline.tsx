'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/client/api';
import type { EditorBlock } from '@/components/editor/BlockEditor';

const TYPE_LABELS: Record<string, string> = {
  heading: '제목',
  paragraph: '문단',
  image: '이미지',
  checklist: '체크리스트',
  source_reference: '출처',
  cta: 'CTA',
  chart: '차트',
};

function blockSummary(block: EditorBlock): string {
  const c = block.content as { text?: string; title?: string; caption?: string };
  return (c.text ?? c.title ?? c.caption ?? '').slice(0, 24) || '(비어 있음)';
}

type Props = {
  documentId: string;
  blocks: EditorBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
};

const EXPORT_FORMATS = [
  { format: 'txt', label: 'TXT' },
  { format: 'markdown', label: 'Markdown' },
  { format: 'pdf', label: 'PDF' },
] as const;

/** 우측 문서 블록 목록 + 내보내기 사이드바 */
export function BlockOutline({ documentId, blocks, selectedBlockId, onSelectBlock }: Props) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleExport(format: 'txt' | 'markdown' | 'pdf') {
    setExporting(format);
    setExportError(null);
    try {
      const result = await apiFetch<{ jobId: string; downloadUrl: string }>('/api/exports', {
        method: 'POST',
        body: JSON.stringify({ documentId, format }),
      });
      window.open(result.downloadUrl, '_blank');
    } catch (e) {
      setExportError((e as Error).message);
    } finally {
      setExporting(null);
    }
  }

  return (
    <aside className="flex w-60 flex-col border-l border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-700">문서 블록</h2>
      </div>
      <div className="border-b border-zinc-200 p-3">
        <p className="mb-2 text-xs font-semibold text-zinc-500">내보내기</p>
        <div className="flex gap-1.5">
          {EXPORT_FORMATS.map(({ format, label }) => (
            <button
              key={format}
              onClick={() => handleExport(format)}
              disabled={exporting !== null}
              className="flex-1 rounded-md bg-zinc-900 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {exporting === format ? '...' : label}
            </button>
          ))}
        </div>
        {exportError && <p className="mt-2 text-xs text-red-600">{exportError}</p>}
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {blocks.length === 0 ? (
          <p className="px-2 py-4 text-xs text-zinc-400">블록이 없습니다.</p>
        ) : (
          <ul className="space-y-1">
            {blocks.map((block, i) => (
              <li key={block.id}>
                <button
                  onClick={() => onSelectBlock(block.id)}
                  className={`w-full rounded-md px-2 py-1.5 text-left text-xs ${
                    selectedBlockId === block.id
                      ? 'bg-zinc-100 text-zinc-900'
                      : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  <span className="mr-1 text-zinc-400">
                    {i + 1}. {TYPE_LABELS[block.type] ?? block.type}
                  </span>
                  <span className="block truncate">{blockSummary(block)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
