'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BlockTypes } from '@archi/editor';
import { apiFetch } from '@/lib/client/api';
import { moveItem } from '@/lib/client/reorder';
import { ImageGenerateModal } from '@/components/image/ImageGenerateModal';
import { BlockContentEditor } from './BlockContentEditor';

export type EditorBlock = {
  id: string;
  type: string;
  sortOrder: number;
  content: Record<string, unknown>;
};

export type DocumentWithBlocks = {
  id: string;
  projectId: string;
  title: string;
  status: string;
  blocks: EditorBlock[];
};

const NEW_BLOCK_DEFAULTS: Record<string, Record<string, unknown>> = {
  [BlockTypes.HEADING]: { level: 2, text: '' },
  [BlockTypes.PARAGRAPH]: { text: '' },
  [BlockTypes.IMAGE]: { url: '', caption: '' },
  [BlockTypes.CHECKLIST]: { title: '', items: [{ text: '', checked: false }] },
  [BlockTypes.SOURCE_REFERENCE]: { title: '', summary: '', citations: [] },
  [BlockTypes.CTA]: { text: '', buttonLabel: '', url: '' },
};

const BLOCK_TYPE_LABELS: Record<string, string> = {
  heading: '제목',
  paragraph: '문단',
  image: '이미지',
  checklist: '체크리스트',
  source_reference: '출처',
  cta: 'CTA',
};

type Props = {
  documentId: string;
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string | null) => void;
  /** AI action 실행 등 외부 변경 후 재로드 트리거 */
  reloadKey?: number;
  /** 블록 목록 사이드바 등 외부에 현재 블록 상태 전달 */
  onBlocksLoaded?: (blocks: EditorBlock[]) => void;
};

export function BlockEditor({
  documentId,
  selectedBlockId,
  onSelectBlock,
  reloadKey,
  onBlocksLoaded,
}: Props) {
  const [doc, setDoc] = useState<DocumentWithBlocks | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const load = useCallback(() => {
    setLoading(true);
    apiFetch<DocumentWithBlocks>(`/api/documents/${documentId}`)
      .then((data) => {
        setDoc(data);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [documentId]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  useEffect(() => {
    if (doc) onBlocksLoaded?.(doc.blocks);
  }, [doc, onBlocksLoaded]);

  /** 블록 내용 변경: 로컬 즉시 반영 + 800ms 디바운스 autosave */
  function handleBlockChange(blockId: string, content: Record<string, unknown>) {
    setDoc((prev) =>
      prev
        ? {
            ...prev,
            blocks: prev.blocks.map((b) => (b.id === blockId ? { ...b, content } : b)),
          }
        : prev,
    );
    const timers = saveTimers.current;
    const existing = timers.get(blockId);
    if (existing) clearTimeout(existing);
    setSaveState('saving');
    timers.set(
      blockId,
      setTimeout(() => {
        apiFetch(`/api/blocks/${blockId}`, {
          method: 'PATCH',
          body: JSON.stringify({ content }),
        })
          .then(() => setSaveState('saved'))
          .catch((e: Error) => setError(e.message));
        timers.delete(blockId);
      }, 800),
    );
  }

  async function handleAddBlock(type: string) {
    setAddMenuOpen(false);
    try {
      const afterBlockId = selectedBlockId ?? undefined;
      const block = await apiFetch<EditorBlock>(`/api/documents/${documentId}/blocks`, {
        method: 'POST',
        body: JSON.stringify({
          afterBlockId,
          block: { type, content: NEW_BLOCK_DEFAULTS[type] ?? {} },
        }),
      });
      load();
      onSelectBlock(block.id);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDeleteBlock(blockId: string) {
    try {
      await apiFetch(`/api/blocks/${blockId}`, { method: 'DELETE' });
      if (selectedBlockId === blockId) onSelectBlock(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleMove(blockId: string, direction: 'up' | 'down') {
    if (!doc) return;
    const ids = doc.blocks.map((b) => b.id);
    const index = ids.indexOf(blockId);
    const nextIds = moveItem(ids, index, direction);
    if (nextIds.join() === ids.join()) return;
    // 낙관적 갱신 후 서버 재정렬
    setDoc({
      ...doc,
      blocks: nextIds
        .map((id) => doc.blocks.find((b) => b.id === id))
        .filter((b): b is EditorBlock => Boolean(b)),
    });
    try {
      await apiFetch(`/api/documents/${documentId}/reorder-blocks`, {
        method: 'POST',
        body: JSON.stringify({ blockIds: nextIds }),
      });
    } catch (e) {
      setError((e as Error).message);
      load();
    }
  }

  if (loading && !doc) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-400">
        문서를 불러오는 중...
      </div>
    );
  }

  if (error && !doc) {
    return <div className="p-8 text-red-600">{error}</div>;
  }

  if (!doc) return null;

  return (
    <div className="relative flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3">
        <h1 className="text-lg font-bold">{doc.title}</h1>
        <span className="text-xs text-zinc-400">
          {saveState === 'saving' ? '저장 중...' : saveState === 'saved' ? '저장됨' : ''}
        </span>
      </header>

      {error && <p className="px-6 pt-2 text-sm text-red-600">{error}</p>}

      <div className="flex-1 overflow-y-auto px-6 py-6 pb-28">
        {doc.blocks.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 text-zinc-400">
            <p>아직 블록이 없습니다.</p>
            <p className="text-sm">우측 하단 + 버튼으로 첫 블록을 추가하거나 AI에게 요청해 보세요.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {doc.blocks.map((block, index) => (
              <li
                key={block.id}
                onClick={() => onSelectBlock(block.id)}
                className={`group relative rounded-lg border p-3 transition ${
                  selectedBlockId === block.id
                    ? 'border-blue-400 bg-blue-50/40'
                    : 'border-transparent hover:border-zinc-200'
                }`}
              >
                <div className="absolute -top-2.5 right-2 hidden gap-1 rounded-md border border-zinc-200 bg-white px-1 py-0.5 text-xs shadow-sm group-hover:flex">
                  <span className="px-1 text-zinc-400">{BLOCK_TYPE_LABELS[block.type] ?? block.type}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMove(block.id, 'up');
                    }}
                    disabled={index === 0}
                    className="px-1 text-zinc-500 hover:text-zinc-900 disabled:opacity-30"
                    aria-label="위로 이동"
                  >
                    ↑
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMove(block.id, 'down');
                    }}
                    disabled={index === doc.blocks.length - 1}
                    className="px-1 text-zinc-500 hover:text-zinc-900 disabled:opacity-30"
                    aria-label="아래로 이동"
                  >
                    ↓
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBlock(block.id);
                    }}
                    className="px-1 text-zinc-500 hover:text-red-600"
                    aria-label="블록 삭제"
                  >
                    ✕
                  </button>
                </div>
                <BlockContentEditor
                  type={block.type}
                  content={block.content}
                  onChange={(content) => handleBlockChange(block.id, content)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 우측 하단 + 버튼 */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2">
        {addMenuOpen && (
          <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
            {Object.values(BlockTypes).map((type) => (
              <button
                key={type}
                onClick={() => handleAddBlock(type)}
                className="px-4 py-2 text-left text-sm hover:bg-zinc-100"
              >
                {BLOCK_TYPE_LABELS[type]}
              </button>
            ))}
            <button
              onClick={() => {
                setAddMenuOpen(false);
                setImageModalOpen(true);
              }}
              className="border-t border-zinc-100 px-4 py-2 text-left text-sm font-semibold text-violet-600 hover:bg-violet-50"
            >
              ✨ AI 이미지 생성
            </button>
          </div>
        )}
        <button
          onClick={() => setAddMenuOpen((v) => !v)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-2xl text-white shadow-lg hover:bg-zinc-700"
          aria-label="블록 추가"
        >
          +
        </button>
      </div>

      {imageModalOpen && doc && (
        <ImageGenerateModal
          projectId={doc.projectId}
          onClose={() => setImageModalOpen(false)}
          onInsert={async (image) => {
            setImageModalOpen(false);
            try {
              await apiFetch(`/api/documents/${documentId}/blocks`, {
                method: 'POST',
                body: JSON.stringify({
                  afterBlockId: selectedBlockId ?? undefined,
                  block: {
                    type: 'image',
                    content: {
                      imageAssetId: image.imageAssetId,
                      versionId: image.versionId,
                      url: image.url,
                      caption: image.caption,
                    },
                  },
                }),
              });
              load();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      )}
    </div>
  );
}
