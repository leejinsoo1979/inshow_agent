import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { HtmlExporter } from './html';
import { JsonExporter } from './json';
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

const professionalDocument: DocumentForExport = {
  id: 'doc_pro',
  title: '단열 기술자료',
  blocks: [
    {
      id: 'p1',
      type: 'law_reference',
      sortOrder: 0,
      content: { law: '건축물의 에너지절약설계기준', article: '제2조', summary: '단열 기준 정의' },
    },
    {
      id: 'p2',
      type: 'callout',
      sortOrder: 1,
      content: { variant: 'warning', title: '주의', text: '결로 방지 필수' },
    },
    { id: 'p3', type: 'quote', sortOrder: 2, content: { text: '1미터의 법칙', attribution: '시공 원칙' } },
    { id: 'p4', type: 'code', sortOrder: 3, content: { language: 'ts', code: 'const u = 0.24;' } },
    {
      id: 'p5',
      type: 'cost_table',
      sortOrder: 4,
      content: {
        title: '단열 견적',
        currency: '원',
        items: [
          { name: '단열재', spec: 'T100', quantity: 10, unit: '㎡', unitPrice: 20000 },
          { name: '시공비', quantity: 1, unit: '식', unitPrice: 300000 },
        ],
      },
    },
    {
      id: 'p6',
      type: 'construction_detail',
      sortOrder: 5,
      content: { title: '결로방지 상세', steps: ['바탕 정리', '단열재 부착'], notes: '이격 주의' },
    },
  ],
};

describe('전문 블록 타입 내보내기', () => {
  it('Markdown: 6종 전문 블록을 직렬화한다 (견적 합계 포함)', async () => {
    const md = new TextDecoder().decode((await new MarkdownExporter().export(professionalDocument)).data);
    expect(md).toContain('건축물의 에너지절약설계기준');
    expect(md).toContain('결로 방지 필수');
    expect(md).toContain('1미터의 법칙');
    expect(md).toContain('const u = 0.24;');
    expect(md).toContain('단열재');
    // 견적 합계 = 10*20000 + 1*300000 = 500,000
    expect(md).toContain('500,000');
    expect(md).toContain('결로방지 상세');
  });

  it('HTML: code 블록을 이스케이프하고 callout 클래스를 단다', async () => {
    const doc: DocumentForExport = {
      id: 'd',
      title: 't',
      blocks: [
        { id: 'c1', type: 'code', sortOrder: 0, content: { code: 'const x = a < b && c > d;' } },
        { id: 'c2', type: 'callout', sortOrder: 1, content: { variant: 'danger', text: '위험' } },
      ],
    };
    const html = new TextDecoder().decode((await new HtmlExporter().export(doc)).data);
    expect(html).toContain('&lt;'); // < 이스케이프됨
    expect(html).not.toContain('const x = a < b'); // 원문 그대로 들어가면 안 됨
    expect(html).toContain('callout');
  });

  it('TXT: 전문 블록도 빈 출력 없이 텍스트로 변환된다', async () => {
    const txt = new TextDecoder().decode((await new TxtExporter().export(professionalDocument)).data);
    expect(txt).toContain('건축물의 에너지절약설계기준');
    expect(txt).toContain('단열재');
  });
});

describe('JsonExporter', () => {
  it('블록 순서를 보존한 구조화 JSON을 생성한다', async () => {
    const result = await new JsonExporter().export(sampleDocument);
    expect(result.mimeType).toContain('application/json');
    const parsed = JSON.parse(new TextDecoder().decode(result.data));
    expect(parsed.title).toBe('34평 아파트 거실 리모델링');
    expect(parsed.blocks).toHaveLength(7);
    expect(parsed.blocks[0]).toMatchObject({ type: 'heading', sortOrder: 0 });
    expect(parsed.blocks[1].sortOrder).toBe(1);
    // content가 그대로 보존된다
    expect(parsed.blocks[0].content.text).toBe('공간의 변신');
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
