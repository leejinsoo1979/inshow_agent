'use client';

import { use, useCallback, useState } from 'react';
import { AIChatPanel } from '@/components/ai/AIChatPanel';
import { BlockEditor, type EditorBlock } from '@/components/editor/BlockEditor';
import { BlockOutline } from '@/components/studio/BlockOutline';
import { NavRail } from '@/components/studio/NavRail';
import { TopBar } from '@/components/studio/TopBar';

type DocMeta = { id: string; projectId: string; title: string; status: string };

export default function DocumentStudioPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = use(params);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [docMeta, setDocMeta] = useState<DocMeta | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [addMenuKey, setAddMenuKey] = useState(0);

  const handleDocumentChanged = useCallback(() => setReloadKey((k) => k + 1), []);

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-100">
      <NavRail />

      {/* 좌측 AI 에이전트 패널 */}
      <aside className="w-[340px] shrink-0">
        <AIChatPanel
          documentId={documentId}
          selectedBlockId={selectedBlockId}
          onDocumentChanged={handleDocumentChanged}
        />
      </aside>

      {/* 중앙: 상단 바 + 문서 캔버스 */}
      <main className="flex min-w-0 flex-1 flex-col">
        <TopBar
          documentId={documentId}
          title={docMeta?.title ?? ''}
          status={docMeta?.status ?? 'DRAFT'}
          saveState={saveState}
        />
        <div className="min-h-0 flex-1 overflow-hidden p-4">
          <div className="mx-auto h-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <BlockEditor
              documentId={documentId}
              selectedBlockId={selectedBlockId}
              onSelectBlock={setSelectedBlockId}
              reloadKey={reloadKey}
              onBlocksLoaded={setBlocks}
              onDocumentLoaded={setDocMeta}
              onSaveStateChange={setSaveState}
              openAddMenuKey={addMenuKey}
            />
          </div>
        </div>
      </main>

      {/* 우측 블록 패널 */}
      <BlockOutline
        blocks={blocks}
        selectedBlockId={selectedBlockId}
        onSelectBlock={setSelectedBlockId}
        onAddBlock={() => setAddMenuKey((k) => k + 1)}
      />
    </div>
  );
}
