'use client';

import type { EditorBlock } from '@/components/editor/BlockEditor';

const TYPE_LABELS: Record<string, string> = {
  heading: '제목',
  paragraph: '문단',
  image: '이미지',
  checklist: '체크리스트',
  source_reference: '출처',
  cta: 'CTA',
};

function blockSummary(block: EditorBlock): string {
  const c = block.content as { text?: string; title?: string; caption?: string };
  return (c.text ?? c.title ?? c.caption ?? '').slice(0, 24) || '(비어 있음)';
}

type Props = {
  blocks: EditorBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
};

/** 우측 문서 블록 목록 사이드바 */
export function BlockOutline({ blocks, selectedBlockId, onSelectBlock }: Props) {
  return (
    <aside className="flex w-60 flex-col border-l border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-700">문서 블록</h2>
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
                      ? 'bg-violet-50 text-violet-700'
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
