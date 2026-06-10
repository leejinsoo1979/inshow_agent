import type { BlockInput } from './blocks';

/**
 * 문서 유형별 블록 템플릿 (제안서: 문서 유형 선택 시 AI가 문서코드/목차/블록 구조 자동 제안).
 * 문서 생성 시 withTemplate 옵션으로 초기 블록 구조를 구성한다.
 */

export type DocumentTypeKey =
  | 'BLOG_POST'
  | 'PROPOSAL'
  | 'REPORT'
  | 'SNS_CAPTION'
  | 'KNOWLEDGE_NOTE';

export const DOCUMENT_TYPE_LABELS: Record<DocumentTypeKey, string> = {
  BLOG_POST: '블로그',
  PROPOSAL: '제안서',
  REPORT: '기술자료/보고서',
  SNS_CAPTION: 'SNS 캡션',
  KNOWLEDGE_NOTE: '지식 노트',
};

export const documentTemplates: Record<DocumentTypeKey, BlockInput[]> = {
  BLOG_POST: [
    { type: 'heading', content: { level: 1, text: '' } },
    { type: 'image', content: { url: '', caption: '대표 이미지' } },
    { type: 'paragraph', content: { text: '', tone: 'professional' } },
    { type: 'heading', content: { level: 2, text: '시공 포인트' } },
    { type: 'checklist', content: { title: '핵심 체크리스트', items: [{ text: '', checked: false }] } },
    { type: 'paragraph', content: { text: '' } },
    { type: 'cta', content: { text: '', buttonLabel: '무료 상담 신청', url: '' } },
  ],
  PROPOSAL: [
    {
      type: 'doc_meta',
      content: { docCode: '', version: 'v1.0', author: '', publishedAt: '', reviewStatus: 'draft' },
    },
    { type: 'heading', content: { level: 1, text: '' } },
    { type: 'paragraph', content: { text: '제안 개요를 작성하세요.' } },
    { type: 'heading', content: { level: 2, text: '제안 범위' } },
    { type: 'table', content: { title: '제안 범위', headers: ['구분', '내용', '비고'], rows: [['', '', '']] } },
    { type: 'heading', content: { level: 2, text: '예상 비용' } },
    {
      type: 'chart',
      content: {
        chartType: 'pie',
        title: '공정별 비용 비중',
        labels: ['철거', '설비', '목공', '마감'],
        series: [{ name: '비용', values: [0, 0, 0, 0] }],
      },
    },
    { type: 'cta', content: { text: '', buttonLabel: '계약 문의', url: '' } },
  ],
  REPORT: [
    {
      type: 'doc_meta',
      content: { docCode: '', version: 'v1.0', author: '', publishedAt: '', reviewStatus: 'draft' },
    },
    { type: 'heading', content: { level: 1, text: '' } },
    { type: 'paragraph', content: { text: '문제 정의와 적용 범위를 작성하세요.' } },
    { type: 'heading', content: { level: 2, text: '법규·기준' } },
    { type: 'source_reference', content: { title: '관련 법규 검토', summary: '', citations: [] } },
    { type: 'heading', content: { level: 2, text: '계산 기준' } },
    { type: 'formula', content: { title: '', expression: '', variables: [], result: '' } },
    { type: 'heading', content: { level: 2, text: '기준표' } },
    { type: 'table', content: { title: '', headers: ['항목', '기준', '비고'], rows: [['', '', '']] } },
    { type: 'heading', content: { level: 2, text: '시공 절차' } },
    { type: 'checklist', content: { title: '시공 체크리스트', items: [{ text: '', checked: false }] } },
    { type: 'qna', content: { title: '현장 Q&A', items: [{ question: '', answer: '', basis: '' }] } },
  ],
  SNS_CAPTION: [
    { type: 'paragraph', content: { text: '', tone: 'casual' } },
    { type: 'image', content: { url: '', caption: '' } },
    { type: 'cta', content: { text: '', buttonLabel: '프로필 링크', url: '' } },
  ],
  KNOWLEDGE_NOTE: [
    { type: 'heading', content: { level: 1, text: '' } },
    { type: 'paragraph', content: { text: '핵심 개념을 정리하세요.' } },
    { type: 'qna', content: { title: '현장 Q&A', items: [{ question: '', answer: '', basis: '' }] } },
    { type: 'source_reference', content: { title: '출처', summary: '', citations: [] } },
  ],
};

export function getTemplateBlocks(type: DocumentTypeKey): BlockInput[] {
  return documentTemplates[type] ?? [];
}
