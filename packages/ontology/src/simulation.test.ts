import { describe, expect, it } from 'vitest';
import { DEFAULT_SIM_PARAMS, initSimNodes, simTick, type SimEdge } from './simulation';

function makeGraph() {
  const nodes = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id }));
  // a-b-c는 연결된 클러스터, d/e/f는 고립
  const edges: SimEdge[] = [
    { sourceId: 'a', targetId: 'b' },
    { sourceId: 'b', targetId: 'c' },
    { sourceId: 'a', targetId: 'c' },
  ];
  return { nodes, edges };
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

describe('force simulation', () => {
  it('초기 배치는 결정적이고 degree가 계산된다', () => {
    const { nodes, edges } = makeGraph();
    const sim1 = initSimNodes(nodes, edges, DEFAULT_SIM_PARAMS);
    const sim2 = initSimNodes(nodes, edges, DEFAULT_SIM_PARAMS);
    expect(sim1.map((n) => [n.x, n.y])).toEqual(sim2.map((n) => [n.x, n.y]));
    expect(sim1.find((n) => n.id === 'a')!.degree).toBe(2);
    expect(sim1.find((n) => n.id === 'd')!.degree).toBe(0);
  });

  it('시뮬레이션 후 연결 클러스터는 고립 노드들보다 응집되고 좌표가 유한하다', () => {
    const { nodes, edges } = makeGraph();
    const params = { ...DEFAULT_SIM_PARAMS, springLength: 60 };
    const sim = initSimNodes(nodes, edges, params);
    let alpha = 1;
    for (let i = 0; i < 300; i += 1) {
      simTick(sim, edges, alpha, params);
      alpha *= 0.985;
    }
    for (const node of sim) {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
    }
    const byId = new Map(sim.map((n) => [n.id, n]));
    // 스프링으로 묶인 a-b-c 평균 간격 vs 반발력만 받는 d-e-f 평균 간격
    const clusterAvg =
      (dist(byId.get('a')!, byId.get('b')!) +
        dist(byId.get('b')!, byId.get('c')!) +
        dist(byId.get('a')!, byId.get('c')!)) /
      3;
    const isolatedAvg =
      (dist(byId.get('d')!, byId.get('e')!) +
        dist(byId.get('e')!, byId.get('f')!) +
        dist(byId.get('d')!, byId.get('f')!)) /
      3;
    expect(clusterAvg).toBeLessThan(isolatedAvg);
  });

  it('고정(fx/fy)된 노드는 움직이지 않는다', () => {
    const { nodes, edges } = makeGraph();
    const sim = initSimNodes(nodes, edges, DEFAULT_SIM_PARAMS);
    const pinned = sim[0]!;
    pinned.fx = 123;
    pinned.fy = 456;
    for (let i = 0; i < 50; i += 1) {
      simTick(sim, edges, 0.5, DEFAULT_SIM_PARAMS);
    }
    expect(pinned.x).toBe(123);
    expect(pinned.y).toBe(456);
  });
});
