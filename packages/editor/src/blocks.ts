import { z } from 'zod';

/**
 * 문서 블록 스키마. DATA_MODEL.md 2장 Block Content JSON 참조.
 * DB에는 type(string) + content(Json)로 저장되고, 앱 레이어에서 이 스키마로 검증한다.
 */

export const BlockTypes = {
  HEADING: 'heading',
  PARAGRAPH: 'paragraph',
  IMAGE: 'image',
  CHECKLIST: 'checklist',
  SOURCE_REFERENCE: 'source_reference',
  CTA: 'cta',
  CHART: 'chart',
  TABLE: 'table',
  FORMULA: 'formula',
  DOC_META: 'doc_meta',
  QNA: 'qna',
} as const;

export type BlockType = (typeof BlockTypes)[keyof typeof BlockTypes];

export const headingContentSchema = z.object({
  level: z.number().int().min(1).max(3),
  text: z.string(),
});

export const paragraphContentSchema = z.object({
  text: z.string(),
  tone: z.string().optional(),
  seoKeywords: z.array(z.string()).optional(),
});

export const imageContentSchema = z.object({
  imageAssetId: z.string().optional(),
  versionId: z.string().optional(),
  url: z.string().optional(),
  caption: z.string().optional(),
  /** AI가 생성할 이미지 프롬프트. url이 없고 prompt가 있으면 삽입 시 실제 이미지를 생성한다. */
  prompt: z.string().optional(),
});

export const checklistContentSchema = z.object({
  title: z.string().optional(),
  items: z.array(
    z.object({
      text: z.string(),
      checked: z.boolean().default(false),
    }),
  ),
});

export const sourceReferenceContentSchema = z.object({
  title: z.string(),
  summary: z.string().optional(),
  citations: z.array(z.string()).default([]),
});

export const ctaContentSchema = z.object({
  text: z.string(),
  buttonLabel: z.string().optional(),
  url: z.string().optional(),
});

/** 차트/그래프 블록: 데이터는 블록에 내장, 렌더링은 SVG (모노톤) */
export const chartContentSchema = z.object({
  chartType: z.enum(['bar', 'line', 'pie']),
  title: z.string().optional(),
  labels: z.array(z.string()).min(1, '라벨이 최소 1개 필요합니다.'),
  series: z
    .array(
      z.object({
        name: z.string().optional(),
        values: z.array(z.number()).min(1),
      }),
    )
    .min(1, '데이터 시리즈가 최소 1개 필요합니다.'),
});

/** 기준표/비교표 블록 (제안서: 자재 비교표, 규격표, 공정표) */
export const tableContentSchema = z.object({
  title: z.string().optional(),
  headers: z.array(z.string()).min(1, '표 헤더가 최소 1개 필요합니다.'),
  rows: z.array(z.array(z.string())).min(1, '표 행이 최소 1개 필요합니다.'),
});

/** 계산식 블록 (제안서: 열관류율, TDR, 단가·물량 산식) */
export const formulaContentSchema = z.object({
  title: z.string().optional(),
  expression: z.string().min(1, '계산식을 입력해 주세요.'),
  variables: z
    .array(
      z.object({
        symbol: z.string(),
        meaning: z.string(),
        unit: z.string().optional(),
      }),
    )
    .default([]),
  result: z.string().optional(),
});

/** 문서 메타 블록 (제안서: 문서코드, 버전, 발행일, 작성자, 검수 상태) */
export const docMetaContentSchema = z.object({
  docCode: z.string().optional(),
  version: z.string().optional(),
  author: z.string().optional(),
  publishedAt: z.string().optional(),
  reviewStatus: z.enum(['draft', 'review', 'approved']).default('draft'),
});

/** 현장 Q&A 블록 (제안서: 질문, 답변, 근거) */
export const qnaContentSchema = z.object({
  title: z.string().optional(),
  items: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
        basis: z.string().optional(),
      }),
    )
    .min(1, 'Q&A 항목이 최소 1개 필요합니다.'),
});

export const blockContentSchemas: Record<BlockType, z.ZodTypeAny> = {
  heading: headingContentSchema,
  paragraph: paragraphContentSchema,
  image: imageContentSchema,
  checklist: checklistContentSchema,
  source_reference: sourceReferenceContentSchema,
  cta: ctaContentSchema,
  chart: chartContentSchema,
  table: tableContentSchema,
  formula: formulaContentSchema,
  doc_meta: docMetaContentSchema,
  qna: qnaContentSchema,
};

export const blockTypeSchema = z.enum([
  'heading',
  'paragraph',
  'image',
  'checklist',
  'source_reference',
  'cta',
  'chart',
  'table',
  'formula',
  'doc_meta',
  'qna',
]);

export const blockInputSchema = z
  .object({
    type: blockTypeSchema,
    content: z.record(z.unknown()),
    metadata: z.record(z.unknown()).optional(),
  })
  .superRefine((value, ctx) => {
    const schema = blockContentSchemas[value.type];
    const result = schema.safeParse(value.content);
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `'${value.type}' 블록 내용이 올바르지 않습니다.`,
        path: ['content'],
        params: { issues: result.error.issues },
      });
    }
  });

export type BlockInput = z.infer<typeof blockInputSchema>;

export type HeadingContent = z.infer<typeof headingContentSchema>;
export type ParagraphContent = z.infer<typeof paragraphContentSchema>;
export type ImageContent = z.infer<typeof imageContentSchema>;
export type ChecklistContent = z.infer<typeof checklistContentSchema>;
export type SourceReferenceContent = z.infer<typeof sourceReferenceContentSchema>;
export type CtaContent = z.infer<typeof ctaContentSchema>;
export type ChartContent = z.infer<typeof chartContentSchema>;
export type TableContent = z.infer<typeof tableContentSchema>;
export type FormulaContent = z.infer<typeof formulaContentSchema>;
export type DocMetaContent = z.infer<typeof docMetaContentSchema>;
export type QnaContent = z.infer<typeof qnaContentSchema>;

/** 검증된 블록 내용 파싱. 실패 시 한국어 메시지 에러를 던진다. */
export function parseBlockContent(type: string, content: unknown) {
  const blockType = blockTypeSchema.safeParse(type);
  if (!blockType.success) {
    throw new Error(`지원하지 않는 블록 타입입니다: ${type}`);
  }
  const result = blockContentSchemas[blockType.data].safeParse(content);
  if (!result.success) {
    throw new Error(`'${type}' 블록 내용이 올바르지 않습니다.`);
  }
  return result.data as unknown;
}
