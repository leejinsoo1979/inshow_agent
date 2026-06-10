import {
  parseSize,
  type ImageGenerateInput,
  type ImageGenerateResult,
  type ImageInpaintInput,
  type ImageInpaintResult,
  type ImageProvider,
} from './provider';

/**
 * Mock 이미지 provider: 프롬프트 텍스트가 들어간 SVG 플레이스홀더를 생성한다.
 * 실제 생성 모델 어댑터로 교체해도 인터페이스는 동일하다.
 */
export class MockImageProvider implements ImageProvider {
  readonly name = 'mock';

  async generate(input: ImageGenerateInput): Promise<ImageGenerateResult> {
    const { width, height } = parseSize(input.size);
    const count = Math.min(Math.max(input.count ?? 1, 1), 4);
    const images = Array.from({ length: count }, (_, i) =>
      makeSvg(input.prompt, width, height, i, input.style),
    );
    return { images, provider: 'mock', model: 'mock-image-1' };
  }

  async inpaint(input: ImageInpaintInput): Promise<ImageInpaintResult> {
    const { width, height } = parseSize(input.size);
    const image = makeSvg(`[인페인트] ${input.prompt}`, width, height, 9, 'inpaint');
    return { image, provider: 'mock', model: 'mock-inpaint-1' };
  }
}

const PALETTES = [
  ['#8b7cf6', '#5b4ddb'],
  ['#f6a87c', '#db7c4d'],
  ['#7cc8f6', '#4d8bdb'],
  ['#9bdb89', '#5fa84e'],
  ['#dbc54d', '#a8923a'],
  ['#db4d7c', '#a83a5f'],
  ['#4ddbc5', '#3aa892'],
  ['#b44ddb', '#8a3aa8'],
  ['#778899', '#4a5a6a'],
  ['#e0b89a', '#b08a6a'],
];

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function makeSvg(
  prompt: string,
  width: number,
  height: number,
  seed: number,
  style?: string,
): { data: Uint8Array; mimeType: string; width: number; height: number } {
  const palette = PALETTES[seed % PALETTES.length] ?? PALETTES[0]!;
  const label = escapeXml(prompt.slice(0, 60));
  const styleLabel = style ? escapeXml(style) : 'interior';
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette[0]}"/>
      <stop offset="100%" stop-color="${palette[1]}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect x="${width * 0.06}" y="${height * 0.62}" width="${width * 0.88}" height="${height * 0.3}" rx="12" fill="rgba(0,0,0,0.35)"/>
  <text x="${width * 0.09}" y="${height * 0.72}" font-family="sans-serif" font-size="${Math.round(height * 0.04)}" fill="#ffffff" opacity="0.85">AI 생성 이미지 (mock) · ${styleLabel}</text>
  <text x="${width * 0.09}" y="${height * 0.8}" font-family="sans-serif" font-size="${Math.round(height * 0.045)}" fill="#ffffff" font-weight="bold">${label}</text>
</svg>`;
  return {
    data: new TextEncoder().encode(svg),
    mimeType: 'image/svg+xml',
    width,
    height,
  };
}
