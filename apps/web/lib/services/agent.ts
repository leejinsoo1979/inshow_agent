import { prisma, type Prisma } from '@archi/db';
import {
  agentActionSchema,
  MockSearchProvider,
  planAgentResponse,
  requiresCitation,
  routeAgentRole,
  type AgentActionInput,
  type AgentPlan,
  type AgentRole,
  type LlmProvider,
  type SearchResult,
} from '@archi/ai';
import { blockInputSchema } from '@archi/editor';
import { getLlmProviderForWorkspace } from './llm-config';
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
  const { workspaceId } = await requireDocumentCapability(
    userId,
    input.documentId,
    Capabilities.USE_AI,
  );

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

  // 역할별 에이전트 라우팅 (콘텐츠/법규/시공/이미지/지식/PM)
  const agentRole = routeAgentRole(input.message);

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

  let plan = planAgentResponse({
    message: input.message,
    documentId: document.id,
    documentTitle: document.title,
    selectedBlockId,
    selectedBlockText,
    searchResults,
  });

  // 워크스페이스에 실제 LLM API가 등록되어 있으면 LLM 기반 초안 생성 시도.
  // 법규/공법 질문은 citation 강제 규칙 때문에 항상 검색 기반 플로우를 따른다.
  if (!requiresCitation(input.message)) {
    const provider = await getLlmProviderForWorkspace(workspaceId);
    if (provider.name !== 'mock') {
      const llmPlan = await planWithLlm(provider, {
        message: input.message,
        documentId: document.id,
        documentTitle: document.title,
        selectedBlockId,
        selectedBlockText,
        role: agentRole,
      });
      if (llmPlan) plan = llmPlan;
    }
  }

  // 액션은 저장 전 서버에서 zod 재검증한다 (allowlist + schema)
  const validActions = plan.actions.map((a) => agentActionSchema.parse(a));

  const assistantMessage = await prisma.chatMessage.create({
    data: {
      chatSessionId: chatSession.id,
      role: 'ASSISTANT',
      content: { text: plan.reply, agentRole: agentRole.key },
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
    agentRole: { key: agentRole.key, label: agentRole.label },
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

const llmPlanResponseSchema = z.object({
  reply: z.string().min(1),
  blocks: z.array(blockInputSchema).default([]),
  updated_text: z.string().optional(),
});

/**
 * 실제 LLM으로 초안/수정안 생성.
 * 응답은 JSON으로 강제하고 블록은 zod로 재검증한다. 실패 시 null을 반환해 mock 플랜으로 폴백.
 */
async function planWithLlm(
  provider: LlmProvider,
  args: {
    message: string;
    documentId: string;
    documentTitle?: string;
    selectedBlockId?: string;
    selectedBlockText?: string;
    role?: AgentRole;
  },
): Promise<AgentPlan | null> {
  const system = [
    args.role?.persona ?? '너는 건축·인테리어 전문 콘텐츠를 작성하는 ARCHI Agent Studio의 AI 에이전트다.',
    '반드시 JSON 객체 하나만 출력해라. 마크다운 코드펜스나 다른 텍스트를 붙이지 마라.',
    '형식: {"reply": "사용자에게 보여줄 한국어 응답", "blocks": [...], "updated_text": "선택 블록 수정안(선택)"}',
    'blocks 항목은 다음 타입만 허용: heading {level:1|2|3, text}, paragraph {text}, checklist {title?, items:[{text, checked:false}]}, cta {text, buttonLabel?, url?}, chart {chartType:"bar"|"line"|"pie", title?, labels:[...], series:[{name?, values:[숫자...]}]},',
    '문서에 삽입할 내용이 없으면 blocks는 빈 배열로 둔다.',
    '사용자가 선택한 블록의 수정을 요청하면 updated_text에 수정안만 넣고 blocks는 비운다.',
  ].join('\n');

  const prompt = [
    `문서 제목: ${args.documentTitle ?? '(없음)'}`,
    args.selectedBlockText ? `선택된 블록 내용: ${args.selectedBlockText}` : '',
    `사용자 요청: ${args.message}`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const result = await provider.generateText({ system, prompt, maxTokens: 3000 });
    const jsonText = extractJsonObject(result.text);
    const parsed = llmPlanResponseSchema.parse(JSON.parse(jsonText));

    const actions: AgentActionInput[] = [];
    if (args.selectedBlockId && parsed.updated_text) {
      actions.push({
        action_type: 'update_block',
        target: { documentId: args.documentId, blockId: args.selectedBlockId },
        payload: { content: { text: parsed.updated_text } },
        requires_approval: true,
        risk_level: 'low',
      });
    } else if (parsed.blocks.length > 0) {
      actions.push({
        action_type: 'insert_blocks',
        target: { documentId: args.documentId },
        payload: { blocks: parsed.blocks },
        requires_approval: true,
        risk_level: 'low',
      });
    }
    return { reply: parsed.reply, actions };
  } catch (error) {
    console.warn('[agent] LLM 플랜 생성 실패, mock 플랜으로 폴백합니다:', error);
    return null;
  }
}

function extractJsonObject(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('LLM 응답에서 JSON을 찾지 못했습니다.');
  return candidate.slice(start, end + 1);
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
