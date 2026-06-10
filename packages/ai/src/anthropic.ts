import type {
  GenerateTextInput,
  GenerateTextResult,
  LlmProvider,
  StreamChunk,
} from './llm-provider';

/**
 * Anthropic Claude API 어댑터 (fetch 기반, SDK 의존성 없음).
 * 워크스페이스 설정에서 등록한 API 키로 생성된다.
 */
export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';

  constructor(
    private readonly options: { apiKey: string; model?: string; baseUrl?: string },
  ) {}

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const baseUrl = this.options.baseUrl?.replace(/\/$/, '') || 'https://api.anthropic.com';
    const model = this.options.model || 'claude-sonnet-4-6';
    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.options.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: input.maxTokens ?? 2048,
        temperature: input.temperature,
        system: input.system,
        messages: [{ role: 'user', content: input.prompt }],
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Anthropic API 오류 (${response.status}): ${body.slice(0, 300)}`);
    }
    const data = (await response.json()) as {
      model: string;
      content: { type: string; text?: string }[];
    };
    const text = data.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text ?? '')
      .join('');
    return { text, model: data.model, provider: 'anthropic' };
  }

  async *streamText(input: GenerateTextInput): AsyncIterable<StreamChunk> {
    // MVP: 비스트리밍 호출 후 한 번에 전달. 실제 SSE 스트리밍은 추후 확장.
    const result = await this.generateText(input);
    yield { type: 'text_delta', text: result.text };
    yield { type: 'done' };
  }
}
