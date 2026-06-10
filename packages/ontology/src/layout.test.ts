import { describe, expect, it } from 'vitest';
import { computeRadialLayout } from './layout';

describe('computeRadialLayout', () => {
  it('모든 노드가 영역 내에 고유한 위치를 가진다', () => {
    const nodes = Array.from({ length: 10 }, (_, i) => ({
      id: `n${i}`,
      type: i % 2 === 0 ? 'material' : 'method',
    }));
    const positions = computeRadialLayout(nodes, { width: 800, height: 600 });
    expect(positions.size).toBe(10);
    const seen = new Set<string>();
    for (const [, pos] of positions) {
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.x).toBeLessThanOrEqual(800);
      expect(pos.y).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeLessThanOrEqual(600);
      const key = `${Math.round(pos.x)},${Math.round(pos.y)}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('단일 노드는 중앙에 배치된다', () => {
    const positions = computeRadialLayout([{ id: 'a', type: 't' }], { width: 400, height: 400 });
    expect(positions.get('a')).toEqual({ x: 200, y: 200 });
  });

  it('빈 입력은 빈 결과', () => {
    expect(computeRadialLayout([]).size).toBe(0);
  });
});
