'use client';

import { FiTrash2 } from 'react-icons/fi';
import type { EditorBlock } from '@/components/editor/BlockEditor';

const TYPE_LABELS: Record<string, string> = {
  heading: '제목',
  paragraph: '문단',
  image: '이미지',
  checklist: '체크리스트',
  source_reference: '출처',
  cta: 'CTA',
  chart: '차트',
  table: '표',
  formula: '계산식',
  doc_meta: '문서정보',
  qna: 'Q&A',
};

function blockSummary(block: EditorBlock): string {
  const c = block.content as { text?: string; title?: string; caption?: string; docCode?: string };
  return (c.text ?? c.title ?? c.caption ?? c.docCode ?? '').slice(0, 24) || '(비어 있음)';
}

type Props = {
  blocks: EditorBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onAddBlock: () => void;
  onDeleteBlock: (id: string) => void;
};

/** 우측 문서 블록 패널 (블록 목록 + 선택/삭제 + 하단 블록 추가 버튼) */
export function BlockOutline({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onAddBlock,
  onDeleteBlock,
}: Props) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-l border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-xs font-bold text-zinc-700">문서 블록</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {blocks.length === 0 ? (
          <p className="px-2 py-4 text-xs text-zinc-400">블록이 없습니다.</p>
        ) : (
          <ul className="space-y-1">
            {blocks.map((block, i) => {
              const selected = selectedBlockId === block.id;
              return (
                <li key={block.id} className="group relative">
                  <button
                    onClick={() => onSelectBlock(block.id)}
                    className={`w-full rounded-lg border px-2.5 py-2 pr-7 text-left text-xs transition ${
                      selected
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-100 bg-zinc-50 text-zinc-600 hover:border-zinc-300'
                    }`}
                  >
                    <span
                      className={`mb-0.5 block text-[10px] font-semibold ${
                        selected ? 'text-zinc-300' : 'text-zinc-400'
                      }`}
                    >
                      {i + 1} · {TYPE_LABELS[block.type] ?? block.type}
                    </span>
                    <span className="block truncate">{blockSummary(block)}</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('이 블록을 삭제할까요? 본문에서도 사라집니다.')) {
                        onDeleteBlock(block.id);
                      }
                    }}
                    title="블록 삭제"
                    aria-label="블록 삭제"
                    className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded transition ${
                      selected
                        ? 'text-zinc-400 hover:bg-white/15 hover:text-white'
                        : 'text-zinc-300 opacity-0 hover:bg-zinc-200 hover:text-red-600 group-hover:opacity-100'
                    }`}
                  >
                    <FiTrash2 size={12} aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="border-t border-zinc-200 p-3">
        <button
          onClick={onAddBlock}
          className="w-full rounded-lg bg-zinc-900 py-2 text-xs font-bold text-white hover:bg-zinc-700"
        >
          + 블록 추가
        </button>
      </div>
    </aside>
  );
}
