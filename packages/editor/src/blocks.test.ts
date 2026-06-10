import { describe, expect, it } from 'vitest';
import { blockContentSchemas, blockTypeSchema, parseBlockContent } from './blocks';

describe('블록 타입 레지스트리', () => {
  it('스펙의 30종 블록 타입이 등록돼 있다', () => {
    expect(blockTypeSchema.options.length).toBe(30);
  });

  it('모든 타입에 content 스키마가 매핑돼 있다', () => {
    for (const t of blockTypeSchema.options) {
      expect(blockContentSchemas[t]).toBeDefined();
    }
  });

  it('확장 전문 블록이 유효한 내용으로 파싱된다', () => {
    expect(() => parseBlockContent('risk_warning', { severity: 'high', risk: '추락 위험' })).not.toThrow();
    expect(() => parseBlockContent('schedule', { items: [{ task: '철거' }] })).not.toThrow();
    expect(() => parseBlockContent('material_spec', { material: '단열재', specs: [{ key: '두께', value: '100mm' }] })).not.toThrow();
    expect(() => parseBlockContent('ontology_summary', { title: '관련 지식', nodes: ['결로'] })).not.toThrow();
    expect(() => parseBlockContent('before_after', { before: { label: '전' }, after: { label: '후' } })).not.toThrow();
    expect(() => parseBlockContent('blog_section', { heading: '제목', body: '본문' })).not.toThrow();
    expect(() => parseBlockContent('seo_meta', { keywords: ['a', 'b'] })).not.toThrow();
  });

  it('잘못된 내용은 거부된다', () => {
    expect(() => parseBlockContent('risk_warning', {})).toThrow(); // risk 필수
    expect(() => parseBlockContent('unknown_type', {})).toThrow();
  });
});
