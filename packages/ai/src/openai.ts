import type {
  GenerateTextInput,
  GenerateTextResult,
  LlmProvider,
  StreamChunk,
} from './llm-provider';

/**
 * OpenAI 어댑터 (fetch 기반, SDK 의존성 없음).
 * 인증: API 키 또는 ChatGPT 계정 OAuth access token — 둘 다 Bearer 헤더 사용.
 */
export class OpenAIProvider implements LlmProvider {
  readonly name = 'openai';

  constructor(
    private readonly options: {
      apiKey?: string;
      /** ChatGPT 계정 OAuth access token */
      authToken?: string;
      model?: string;
      baseUrl?: string;
    },
  ) {}

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const token = this.options.authToken ?? this.options.apiKey;
    if (!token) throw new Error('OpenAI 인증 정보(apiKey 또는 authToken)가 없습니다.');

    const baseUrl = this.options.baseUrl?.replace(/\/$/, '') || 'https://api.openai.com';
    const model = this.options.model || 'gpt-4o';
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_completion_tokens: input.maxTokens ?? 2048,
        temperature: input.temperature,
        messages: [
          ...(input.system ? [{ role: 'system', content: input.system }] : []),
          { role: 'user', content: input.prompt },
        ],
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`OpenAI API 오류 (${response.status}): ${body.slice(0, 300)}`);
    }
    const data = (await response.json()) as {
      model: string;
      choices: { message?: { content?: string } }[];
    };
    return {
      text: data.choices[0]?.message?.content ?? '',
      model: data.model,
      provider: 'openai',
    };
  }

  async *streamText(input: GenerateTextInput): AsyncIterable<StreamChunk> {
    const result = await this.generateText(input);
    yield { type: 'text_delta', text: result.text };
    yield { type: 'done' };
  }
}
