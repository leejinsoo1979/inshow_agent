'use client';

import { use, useCallback, useState } from 'react';
import { AIChatPanel } from '@/components/ai/AIChatPanel';
import { BlockEditor, type EditorBlock } from '@/components/editor/BlockEditor';
import { BlockOutline } from '@/components/studio/BlockOutline';
import { NavRail } from '@/components/studio/NavRail';

export default function DocumentStudioPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = use(params);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);

  const handleDocumentChanged = useCallback(() => setReloadKey((k) => k + 1), []);

  return (
    <div className="flex h-screen overflow-hidden">
      <NavRail />

      {/* 좌측 AI 에이전트 패널 */}
      <aside className="w-[360px] shrink-0">
        <AIChatPanel
          documentId={documentId}
          selectedBlockId={selectedBlockId}
          onDocumentChanged={handleDocumentChanged}
        />
      </aside>

      {/* 중앙 문서 캔버스 */}
      <main className="min-w-0 flex-1 bg-zinc-100">
        <div className="mx-auto h-full max-w-3xl bg-white shadow-sm">
          <BlockEditor
            documentId={documentId}
            selectedBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
            reloadKey={reloadKey}
            onBlocksLoaded={setBlocks}
          />
        </div>
      </main>

      {/* 우측 블록 목록 */}
      <BlockOutline
        blocks={blocks}
        selectedBlockId={selectedBlockId}
        onSelectBlock={setSelectedBlockId}
      />
    </div>
  );
}
