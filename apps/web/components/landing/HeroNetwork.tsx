'use client';

import { useEffect, useRef } from 'react';

/**
 * 레퍼런스(v0-jarvis) 히어로의 constellation 네트워크 클론.
 * 떠다니는 노드들을 거리 기반으로 선으로 연결한다. 우측에 밀도가 높고 좌측으로 페이드.
 */
export function HeroNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let raf = 0;

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      blue: boolean;
    };
    let particles: Particle[] = [];

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const LINK_DIST = 150;

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = width * DPR;
      canvas!.height = height * DPR;
      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);

      const count = Math.min(Math.floor((width * height) / 4200), 320);
      particles = Array.from({ length: count }, () => {
        // 우측으로 밀도 편향 (레퍼런스처럼 헤드라인 반대편에 군집)
        const bias = Math.pow(Math.random(), 0.6);
        return {
          x: width * (0.18 + bias * 0.82) * (Math.random() < 0.15 ? Math.random() : 1),
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: Math.random() < 0.22 ? 2.2 : 1.3,
          blue: Math.random() < 0.35,
        };
      });
    }

    function tick() {
      ctx!.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;
      }

      // 연결선
      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i]!;
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j]!;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > LINK_DIST) continue;
          const alpha = (1 - dist / LINK_DIST) * 0.6;
          ctx!.strokeStyle =
            a.blue || b.blue
              ? `rgba(96, 152, 255, ${alpha})`
              : `rgba(255, 255, 255, ${alpha * 0.65})`;
          ctx!.lineWidth = 0.8;
          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y);
          ctx!.lineTo(b.x, b.y);
          ctx!.stroke();
        }
      }

      // 노드
      for (const p of particles) {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = p.blue ? 'rgba(109, 163, 255, 0.95)' : 'rgba(255, 255, 255, 0.75)';
        ctx!.fill();
        if (p.blue && p.r > 1.4) {
          // 큰 블루 노드에 글로우
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.r * 3.2, 0, Math.PI * 2);
          ctx!.fillStyle = 'rgba(77, 141, 255, 0.10)';
          ctx!.fill();
        }
      }

      raf = requestAnimationFrame(tick);
    }

    resize();
    tick();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full [mask-image:linear-gradient(to_right,rgba(0,0,0,0.25)_0%,rgba(0,0,0,0.6)_28%,black_55%)]"
    />
  );
}
