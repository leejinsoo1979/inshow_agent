import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MarkdownExporter } from './markdown';
import { PdfExporter } from './pdf';
import { TxtExporter } from './txt';
import type { DocumentForExport } from './types';

const sampleDocument: DocumentForExport = {
  id: 'doc_1',
  title: '34평 아파트 거실 리모델링',
  blocks: [
    { id: 'b1', type: 'heading', sortOrder: 0, content: { level: 1, text: '공간의 변신' } },
    { id: 'b2', type: 'paragraph', sortOrder: 1, content: { text: '첫 번째 문단입니다.' } },
    {
      id: 'b3',
      type: 'image',
      sortOrder: 2,
      content: { url: 'https://example.com/living.jpg', caption: '간접조명을 적용한 거실' },
    },
    {
      id: 'b4',
      type: 'checklist',
      sortOrder: 3,
      content: {
        title: '시공 체크리스트',
        items: [
          { text: '결로 점검', checked: true },
          { text: '단열 보강', checked: false },
        ],
      },
    },
    {
      id: 'b5',
      type: 'source_reference',
      sortOrder: 4,
      content: { title: '건축법 시행령', summary: '방화문 관련 규정', citations: [] },
    },
    { id: 'b6', type: 'paragraph', sortOrder: 5, content: { text: '두 번째 문단입니다.' } },
    {
      id: 'b7',
      type: 'cta',
      sortOrder: 6,
      content: { text: '무료 상담을 신청하세요', buttonLabel: '상담 신청', url: 'https://example.com' },
    },
  ],
};

describe('TxtExporter', () => {
  it('블록 순서를 유지하고 출처를 목록으로 변환한다', async () => {
    const result = await new TxtExporter().export(sampleDocument);
    const text = new TextDecoder().decode(result.data);

    const firstIdx = text.indexOf('첫 번째 문단');
    const secondIdx = text.indexOf('두 번째 문단');
    expect(firstIdx).toBeGreaterThan(-1);
    expect(secondIdx).toBeGreaterThan(firstIdx);

    // 이미지 캡션 포함
    expect(text).toContain('간접조명을 적용한 거실');
    // 출처 목록 변환
    expect(text).toContain('출처');
    expect(text).toContain('1. 건축법 시행령');
    expect(result.mimeType).toContain('text/plain');
  });
});

describe('MarkdownExporter', () => {
  it('마크다운 문법으로 변환하고 출처 섹션을 만든다', async () => {
    const result = await new MarkdownExporter().export(sampleDocument);
    const md = new TextDecoder().decode(result.data);

    expect(md).toContain('# 34평 아파트 거실 리모델링');
    expect(md).toContain('## 공간의 변신');
    expect(md).toContain('![간접조명을 적용한 거실](https://example.com/living.jpg)');
    expect(md).toContain('- [x] 결로 점검');
    expect(md).toContain('- [ ] 단열 보강');
    expect(md).toContain('## 출처');
    expect(md).toContain('**건축법 시행령**');
    // source_reference는 본문이 아닌 출처 섹션에만 나타난다
    expect(md.indexOf('건축법 시행령')).toBeGreaterThan(md.indexOf('## 출처'));
  });
});

describe('PdfExporter', () => {
  it('한글 폰트로 유효한 PDF를 생성한다', async () => {
    const fontBytes = await readFile(
      path.join(process.cwd(), 'packages/export/fonts/NotoSansKR-Regular.otf'),
    );
    const result = await new PdfExporter().export(sampleDocument, { fontBytes });

    expect(result.mimeType).toBe('application/pdf');
    const header = new TextDecoder().decode(result.data.slice(0, 5));
    expect(header).toBe('%PDF-');
    expect(result.data.length).toBeGreaterThan(1000);
  });

  it('긴 문서도 여러 페이지로 생성된다', async () => {
    const longDoc: DocumentForExport = {
      id: 'doc_long',
      title: '긴 문서',
      blocks: Array.from({ length: 80 }, (_, i) => ({
        id: `b${i}`,
        type: 'paragraph',
        sortOrder: i,
        content: { text: `문단 ${i}: 건축 인테리어 시공 품질 관리를 위한 상세 내용입니다. `.repeat(3) },
      })),
    };
    const fontBytes = await readFile(
      path.join(process.cwd(), 'packages/export/fonts/NotoSansKR-Regular.otf'),
    );
    const result = await new PdfExporter().export(longDoc, { fontBytes });
    expect(result.data.length).toBeGreaterThan(5000);
  });
});
