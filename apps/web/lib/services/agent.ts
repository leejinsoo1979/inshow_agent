import { prisma, type Prisma } from '@archi/db';
import {
  agentActionSchema,
  MockSearchProvider,
  planAgentResponse,
  requiresCitation,
  type AgentActionInput,
  type SearchResult,
} from '@archi/ai';
import { sanitizeUntrustedText } from '@archi/security';
import { AppError, Capabilities, ErrorCodes } from '@archi/shared';
import { z } from 'zod';
import { requireDocumentCapability } from '../authz';
import { writeAuditLog } from '../audit';
import { addBlock, updateBlock } from './blocks';

type CitationDraft = {
  title: string;
  url?: string;
  publisher?: string;
  quote?: string;
  sourceType?: string;
  retrievedAt?: string;
};

export const chatRequestSchema = z.object({
  chatSessionId: z.string().optional(),
  documentId: z.string().min(1),
  selectedBlockIds: z.array(z.string()).default([]),
  message: z.string().min(1, '메시지를 입력해 주세요.').max(4000),
});

/**
 * AI 채팅 한 턴 처리:
 * 사용자 메시지 저장 → mock LLM 계획 → assistant 메시지 + PROPOSED 액션 저장
 */
export async function chat(userId: string, input: z.infer<typeof chatRequestSchema>) {
  await requireDocumentCapability(userId, input.documentId, Capabilities.USE_AI);

  const document = await prisma.document.findUniqueOrThrow({
    where: { id: input.documentId },
    select: { id: true, title: true },
  });

  const session = input.chatSessionId
    ? await prisma.chatSession.findFirst({
        where: { id: input.chatSessionId, documentId: input.documentId },
      })
    : null;
  const chatSession =
    session ??
    (await prisma.chatSession.create({
      data: { documentId: input.documentId, title: input.message.slice(0, 50) },
    }));

  await prisma.chatMessage.create({
    data: {
      chatSessionId: chatSession.id,
      userId,
      role: 'USER',
      content: { text: input.message, selectedBlockIds: input.selectedBlockIds },
    },
  });

  const selectedBlockId = input.selectedBlockIds[0];
  let selectedBlockText: string | undefined;
  if (selectedBlockId) {
    const block = await prisma.documentBlock.findFirst({
      where: { id: selectedBlockId, documentId: input.documentId },
    });
    const content = block?.content as { text?: string } | undefined;
    selectedBlockText = content?.text;
  }

  // 법규/공법 질문이면 출처 검색을 먼저 수행한다 (citation 없는 확답 금지)
  let searchResults: SearchResult[] | undefined;
  if (requiresCitation(input.message)) {
    const provider = new MockSearchProvider();
    const raw = await provider.search(input.message, { limit: 5 });
    // 외부 검색 결과는 신뢰할 수 없는 입력 — LLM 컨텍스트 투입 전 injection 필터 적용
    searchResults = raw.map((r) => ({
      ...r,
      title: sanitizeUntrustedText(r.title),
      snippet: sanitizeUntrustedText(r.snippet),
    }));
  }

  const plan = planAgentResponse({
    message: input.message,
    documentId: document.id,
    documentTitle: document.title,
    selectedBlockId,
    selectedBlockText,
    searchResults,
  });

  // 액션은 저장 전 서버에서 zod 재검증한다 (allowlist + schema)
  const validActions = plan.actions.map((a) => agentActionSchema.parse(a));

  const assistantMessage = await prisma.chatMessage.create({
    data: {
      chatSessionId: chatSession.id,
      role: 'ASSISTANT',
      content: { text: plan.reply },
    },
  });

  const actions = await Promise.all(
    validActions.map((action) =>
      prisma.agentAction.create({
        data: {
          chatSessionId: chatSession.id,
          documentId: input.documentId,
          type: action.action_type,
          payload: action as unknown as Prisma.InputJsonValue,
          riskLevel: action.risk_level,
          requiresApproval: action.requires_approval,
        },
      }),
    ),
  );

  await writeAuditLog({
    actorId: userId,
    action: 'agent.chat',
    targetType: 'ChatSession',
    targetId: chatSession.id,
    after: { message: input.message, proposedActions: actions.map((a) => a.id) },
  });

  return {
    chatSessionId: chatSession.id,
    reply: { id: assistantMessage.id, text: plan.reply },
    sources: searchResults ?? [],
    actions: actions.map((a) => ({
      id: a.id,
      type: a.type,
      payload: a.payload,
      riskLevel: a.riskLevel,
      requiresApproval: a.requiresApproval,
      status: a.status,
    })),
  };
}

/** 액션 승인 + 실행. 실행 전후 감사 로그를 남긴다 */
export async function approveAction(userId: string, actionId: string) {
  const action = await prisma.agentAction.findUnique({ where: { id: actionId } });
  if (!action || !action.documentId) {
    throw new AppError(ErrorCodes.NOT_FOUND, { message: 'AI 액션을 찾을 수 없습니다.' });
  }
  if (action.status !== 'PROPOSED') {
    throw new AppError(ErrorCodes.CONFLICT, {
      message: '이미 처리된 액션입니다.',
      details: { status: action.status },
    });
  }
  await requireDocumentCapability(userId, action.documentId, Capabilities.EDIT_DOCUMENTS);

  const parsed = agentActionSchema.safeParse(action.payload);
  if (!parsed.success) {
    await prisma.agentAction.update({ where: { id: actionId }, data: { status: 'FAILED' } });
    throw new AppError(ErrorCodes.VALIDATION_FAILED, {
      message: '저장된 액션이 유효하지 않아 실행을 거부했습니다.',
      details: parsed.error.issues,
    });
  }

  await writeAuditLog({
    actorId: userId,
    action: 'agent_action.approve',
    targetType: 'AgentAction',
    targetId: actionId,
    before: { status: action.status },
  });

  try {
    const result = await executeAction(userId, parsed.data);
    const executed = await prisma.agentAction.update({
      where: { id: actionId },
      data: { status: 'EXECUTED', executedAt: new Date() },
    });
    await writeAuditLog({
      actorId: userId,
      action: 'agent_action.execute',
      targetType: 'AgentAction',
      targetId: actionId,
      after: { status: executed.status, result },
    });
    return { status: executed.status, result };
  } catch (error) {
    await prisma.agentAction.update({ where: { id: actionId }, data: { status: 'FAILED' } });
    await writeAuditLog({
      actorId: userId,
      action: 'agent_action.fail',
      targetType: 'AgentAction',
      targetId: actionId,
      after: { error: error instanceof Error ? error.message : String(error) },
    });
    throw error;
  }
}

export async function rejectAction(userId: string, actionId: string) {
  const action = await prisma.agentAction.findUnique({ where: { id: actionId } });
  if (!action || !action.documentId) {
    throw new AppError(ErrorCodes.NOT_FOUND, { message: 'AI 액션을 찾을 수 없습니다.' });
  }
  if (action.status !== 'PROPOSED') {
    throw new AppError(ErrorCodes.CONFLICT, { message: '이미 처리된 액션입니다.' });
  }
  await requireDocumentCapability(userId, action.documentId, Capabilities.USE_AI);
  const rejected = await prisma.agentAction.update({
    where: { id: actionId },
    data: { status: 'REJECTED' },
  });
  await writeAuditLog({
    actorId: userId,
    action: 'agent_action.reject',
    targetType: 'AgentAction',
    targetId: actionId,
    after: { status: rejected.status },
  });
  return { status: rejected.status };
}

async function executeAction(userId: string, action: AgentActionInput) {
  switch (action.action_type) {
    case 'insert_blocks': {
      const inserted = [];
      let afterBlockId = action.target.afterBlockId;
      for (const block of action.payload.blocks) {
        const created = await addBlock(userId, action.target.documentId, {
          afterBlockId,
          block,
        });
        // 출처 블록이면 citation draft를 실제 Citation 레코드로 생성한다
        const drafts = (block.metadata as { citationDrafts?: CitationDraft[] } | undefined)
          ?.citationDrafts;
        if (block.type === 'source_reference' && Array.isArray(drafts) && drafts.length > 0) {
          const citations = await Promise.all(
            drafts.map((d) =>
              prisma.citation.create({
                data: {
                  blockId: created.id,
                  title: d.title,
                  url: d.url,
                  publisher: d.publisher,
                  quote: d.quote,
                  sourceType: d.sourceType,
                  retrievedAt: d.retrievedAt ? new Date(d.retrievedAt) : null,
                },
              }),
            ),
          );
          const content = created.content as Record<string, unknown>;
          await prisma.documentBlock.update({
            where: { id: created.id },
            data: {
              content: {
                ...content,
                citations: citations.map((c) => c.id),
              } as Prisma.InputJsonValue,
            },
          });
        }
        inserted.push(created.id);
        afterBlockId = created.id;
      }
      return { insertedBlockIds: inserted };
    }
    case 'update_block': {
      const updated = await updateBlock(userId, action.target.blockId, {
        content: action.payload.content,
      });
      return { updatedBlockId: updated.id };
    }
  }
}

export async function listSessionMessages(userId: string, chatSessionId: string) {
  const session = await prisma.chatSession.findUnique({
    where: { id: chatSessionId },
    select: { documentId: true },
  });
  if (!session?.documentId) {
    throw new AppError(ErrorCodes.NOT_FOUND, { message: '채팅 세션을 찾을 수 없습니다.' });
  }
  await requireDocumentCapability(userId, session.documentId, Capabilities.VIEW_DOCUMENTS);
  return prisma.chatMessage.findMany({
    where: { chatSessionId },
    orderBy: { createdAt: 'asc' },
  });
}
