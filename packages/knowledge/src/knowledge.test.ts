import { describe, expect, it } from 'vitest';
import { chunkText } from './chunking';
import { cosineSimilarity, MockEmbeddingProvider } from './embedding';

describe('chunkText', () => {
  it('문단 경계로 분할한다', () => {
    const text = '첫 문단입니다.\n\n두 번째 문단입니다.\n\n세 번째 문단입니다.';
    const chunks = chunkText(text, { maxChars: 30 });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0]!.chunkIndex).toBe(0);
  });

  it('긴 문단은 overlap을 두고 분할한다', () => {
    const long = '가'.repeat(2000);
    const chunks = chunkText(long, { maxChars: 800, overlap: 100 });
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    // overlap 확인: 이전 chunk 끝과 다음 chunk 시작이 겹침
    expect(chunks[0]!.text.slice(-100)).toBe(chunks[1]!.text.slice(0, 100));
  });

  it('마크다운 헤더를 섹션으로 기록한다', () => {
    const md = '# 방수공사\n\n담수 테스트는 24시간 이상 실시한다.';
    const chunks = chunkText(md);
    expect(chunks[0]!.section).toBe('방수공사');
  });

  it('빈 텍스트는 빈 배열', () => {
    expect(chunkText('   \n\n  ')).toEqual([]);
  });
});

describe('MockEmbeddingProvider', () => {
  it('관련 텍스트가 무관한 텍스트보다 높은 유사도를 가진다', async () => {
    const provider = new MockEmbeddingProvider();
    const [query, related, unrelated] = await provider.embed([
      '욕실 방수 담수 테스트 순서',
      '욕실 방수층 시공 후 담수 테스트는 24시간 이상 실시한다',
      '주방 상판 자재는 세라믹과 칸스톤이 있다',
    ]);
    const simRelated = cosineSimilarity(query!, related!);
    const simUnrelated = cosineSimilarity(query!, unrelated!);
    expect(simRelated).toBeGreaterThan(simUnrelated);
  });
});
