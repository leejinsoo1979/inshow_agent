import { z } from 'zod';
import { blockInputSchema } from '@archi/editor';

/**
 * Agent Action 계약 (CLAUDE.md 7장).
 * 모든 AI 액션은 서버 allowlist + zod 검증 후에만 실행된다.
 */

export const riskLevelSchema = z.enum(['low', 'medium', 'high']);
export type RiskLevel = z.infer<typeof riskLevelSchema>;

export const insertBlocksActionSchema = z.object({
  action_type: z.literal('insert_blocks'),
  target: z.object({ documentId: z.string(), afterBlockId: z.string().optional() }),
  payload: z.object({ blocks: z.array(blockInputSchema).min(1) }),
  requires_approval: z.boolean().default(true),
  risk_level: riskLevelSchema.default('low'),
});

export const updateBlockActionSchema = z.object({
  action_type: z.literal('update_block'),
  target: z.object({ documentId: z.string(), blockId: z.string() }),
  payload: z.object({ content: z.record(z.unknown()) }),
  requires_approval: z.boolean().default(true),
  risk_level: riskLevelSchema.default('low'),
});

export const agentActionSchema = z.discriminatedUnion('action_type', [
  insertBlocksActionSchema,
  updateBlockActionSchema,
]);

export type AgentActionInput = z.infer<typeof agentActionSchema>;
export type InsertBlocksAction = z.infer<typeof insertBlocksActionSchema>;
export type UpdateBlockAction = z.infer<typeof updateBlockActionSchema>;

/** 실행 가능한 action type allowlist */
export const ALLOWED_ACTION_TYPES = ['insert_blocks', 'update_block'] as const;

export function parseAgentAction(value: unknown): AgentActionInput {
  return agentActionSchema.parse(value);
}
