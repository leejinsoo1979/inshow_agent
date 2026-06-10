/** Image Provider Adapter (ARCHITECTURE.md 6.3) */

export type GeneratedImage = {
  data: Uint8Array;
  mimeType: string;
  width: number;
  height: number;
};

export type ImageGenerateInput = {
  prompt: string;
  style?: string;
  size?: string; // "1024x1024"
  count?: number;
};

export type ImageGenerateResult = {
  images: GeneratedImage[];
  provider: string;
  model: string;
};

export type ImageInpaintInput = {
  baseImage: Uint8Array;
  baseMimeType: string;
  mask?: Uint8Array;
  prompt: string;
  size?: string;
};

export type ImageInpaintResult = {
  image: GeneratedImage;
  provider: string;
  model: string;
};

export interface ImageProvider {
  readonly name: string;
  generate(input: ImageGenerateInput): Promise<ImageGenerateResult>;
  inpaint(input: ImageInpaintInput): Promise<ImageInpaintResult>;
}

export function parseSize(size?: string): { width: number; height: number } {
  const match = size?.match(/^(\d{2,4})x(\d{2,4})$/);
  if (!match) return { width: 1024, height: 1024 };
  return { width: Number(match[1]), height: Number(match[2]) };
}
