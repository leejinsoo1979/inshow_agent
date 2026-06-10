import { beforeEach, describe, expect, it } from 'vitest';
import { chartContentSchema } from '@archi/editor';
import { MarkdownExporter, TxtExporter } from '@archi/export';
import { Roles } from '@archi/shared';
import { addMember, createUserWithWorkspace, resetDb } from '../test/testdb';
import { decryptSecret, encryptSecret, maskSecret } from '../crypto';
import {
  deleteLlmConfig,
  getLlmProviderForWorkspace,
  listLlmConfigs,
  registerLlmConfig,
} from './llm-config';
import { createProject } from './projects';
import { createDocument, getDocument } from './documents';
import { approveAction, chat } from './agent';

beforeEach(async () => {
  await resetDb();
});

describe('LLM API 등록', () => {
  it('API 키는 암호화 저장되고 마스킹되어 반환된다', async () => {
    const { user, workspace } = await createUserWithWorkspace(); // OWNER

    const config = await registerLlmConfig(user.id, {
      workspaceId: workspace.id,
      provider: 'anthropic',
      apiKey: 'sk-ant-test-1234abcd',
      model: 'claude-sonnet-4-6',
    });
    expect(config.maskedApiKey).toBe('••••abcd');
    expect(JSON.stringify(config)).not.toContain('sk-ant-test');

    const configs = await listLlmConfigs(user.id, workspace.id);
    expect(configs).toHaveLength(1);
    expect(configs[0]!.maskedApiKey).toBe('••••abcd');
  });

  it('암호화 roundtrip이 동작한다', () => {
    const secret = 'sk-ant-아주비밀스러운키-9999';
    const encrypted = encryptSecret(secret);
    expect(encrypted).not.toContain('9999');
    expect(decryptSecret(encrypted)).toBe(secret);
    expect(maskSecret(secret)).toBe('••••9999');
  });

  it('EDITOR는 LLM API를 등록/조회할 수 없다 (관리자 전용)', async () => {
    const { organization, workspace } = await createUserWithWorkspace();
    const editor = await addMember(organization.id, Roles.EDITOR);
    await expect(
      registerLlmConfig(editor.id, {
        workspaceId: workspace.id,
        provider: 'anthropic',
        apiKey: 'sk-ant-test-secret',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(listLlmConfigs(editor.id, workspace.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('등록된 provider가 선택되고, 삭제하면 mock으로 돌아간다', async () => {
    const { user, workspace } = await createUserWithWorkspace();
    expect((await getLlmProviderForWorkspace(workspace.id)).name).toBe('mock');

    const config = await registerLlmConfig(user.id, {
      workspaceId: workspace.id,
      provider: 'anthropic',
      apiKey: 'sk-ant-test-1234abcd',
    });
    expect((await getLlmProviderForWorkspace(workspace.id)).name).toBe('anthropic');

    await deleteLlmConfig(user.id, config.id);
    expect((await getLlmProviderForWorkspace(workspace.id)).name).toBe('mock');
  });
});

describe('차트 블록', () => {
  it('차트 스키마가 데이터를 검증한다', () => {
    const valid = chartContentSchema.safeParse({
      chartType: 'bar',
      title: '공정별 비용',
      labels: ['철거', '목공'],
      series: [{ name: '비용', values: [100, 200] }],
    });
    expect(valid.success).toBe(true);

    const invalid = chartContentSchema.safeParse({
      chartType: 'donut',
      labels: [],
      series: [],
    });
    expect(invalid.success).toBe(false);
  });

  it('AI에게 차트를 요청하면 chart 블록 액션이 제안되고 승인 시 삽입된다', async () => {
    const { user, workspace } = await createUserWithWorkspace();
    const project = await createProject(user.id, { workspaceId: workspace.id, name: '차트 현장' });
    const doc = await createDocument(user.id, {
      projectId: project.id,
      title: '비용 보고서',
      type: 'REPORT',
    });

    const result = await chat(user.id, {
      documentId: doc.id,
      selectedBlockIds: [],
      message: '공정별 비용 차트 만들어줘',
    });
    expect(result.actions).toHaveLength(1);
    await approveAction(user.id, result.actions[0]!.id);

    const fetched = await getDocument(user.id, doc.id);
    const chartBlock = fetched.blocks.find((b) => b.type === 'chart');
    expect(chartBlock).toBeDefined();
    const content = chartBlock!.content as { labels: string[]; series: { values: number[] }[] };
    expect(content.labels.length).toBeGreaterThan(0);
    expect(content.series[0]!.values.length).toBe(content.labels.length);
  });

  it('차트 블록이 TXT/Markdown export에서 표로 변환된다', async () => {
    const doc = {
      id: 'doc_chart',
      title: '차트 문서',
      blocks: [
        {
          id: 'b1',
          type: 'chart',
          sortOrder: 0,
          content: {
            chartType: 'bar',
            title: '공정별 비용',
            labels: ['철거', '목공'],
            series: [{ name: '비용', values: [350, 980] }],
          },
        },
      ],
    };
    const txt = new TextDecoder().decode((await new TxtExporter().export(doc)).data);
    expect(txt).toContain('[막대 차트: 공정별 비용]');
    expect(txt).toContain('- 철거: 비용 350');

    const md = new TextDecoder().decode((await new MarkdownExporter().export(doc)).data);
    expect(md).toContain('| 항목 | 비용 |');
    expect(md).toContain('| 목공 | 980 |');
  });
});
