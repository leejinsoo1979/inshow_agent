import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@archi/db';
import { routeAgentRole } from '@archi/ai';
import {
  blockInputSchema,
  formulaContentSchema,
  getTemplateBlocks,
  tableContentSchema,
} from '@archi/editor';
import { DocxExporter, HtmlExporter, MarkdownExporter } from '@archi/export';
import { extractEntities, extractRelations } from '@archi/ontology';
import { createUserWithWorkspace, resetDb } from '../test/testdb';
import { createProject } from './projects';
import { createDocument } from './documents';
import { addBlock } from './blocks';
import { extractFromDocument } from './ontology';
import { chat } from './agent';

beforeEach(async () => {
  await resetDb();
});

const TECH_DOC = {
  id: 'doc_tech',
  title: '단열두께의 설계',
  blocks: [
    {
      id: 'b0',
      type: 'doc_meta',
      sortOrder: 0,
      content: { docCode: 'ARC-INS-002', version: 'v1.0', author: '검수자', reviewStatus: 'review' },
    },
    {
      id: 'b1',
      type: 'formula',
      sortOrder: 1,
      content: {
        title: '열관류율',
        expression: 'U = 1 / Rtotal',
        variables: [{ symbol: 'U', meaning: '열관류율', unit: 'W/㎡K' }],
        result: '0.17',
      },
    },
    {
      id: 'b2',
      type: 'table',
      sortOrder: 2,
      content: {
        title: '자재별 두께 산정표',
        headers: ['자재', '두께(mm)'],
        rows: [
          ['PF보드', '90'],
          ['EPS', '155'],
        ],
      },
    },
    {
      id: 'b3',
      type: 'qna',
      sortOrder: 3,
      content: {
        title: '현장 Q&A',
        items: [{ question: '결로 방지 기준은?', answer: 'TDR 기준을 따른다.', basis: '결로 방지 설계기준' }],
      },
    },
  ],
};

describe('갭① 기술 블록 스키마/export', () => {
  it('table/formula 스키마가 검증된다', () => {
    expect(tableContentSchema.safeParse({ headers: ['a'], rows: [['1']] }).success).toBe(true);
    expect(tableContentSchema.safeParse({ headers: [], rows: [] }).success).toBe(false);
    expect(formulaContentSchema.safeParse({ expression: 'U = 1/R' }).success).toBe(true);
    expect(
      blockInputSchema.safeParse({
        type: 'qna',
        content: { items: [{ question: 'q', answer: 'a' }] },
      }).success,
    ).toBe(true);
  });

  it('markdown export에 표/계산식/문서메타/Q&A가 포함된다', async () => {
    const md = new TextDecoder().decode((await new MarkdownExporter().export(TECH_DOC)).data);
    expect(md).toContain('| 자재 | 두께(mm) |');
    expect(md).toContain('| PF보드 | 90 |');
    expect(md).toContain('U = 1 / Rtotal');
    expect(md).toContain('**문서코드** ARC-INS-002');
    expect(md).toContain('**Q. 결로 방지 기준은?**');
  });
});

describe('갭② DOCX/HTML export', () => {
  it('DOCX는 유효한 zip(docx) 바이트를 생성한다', async () => {
    const result = await new DocxExporter().export(TECH_DOC);
    // DOCX = zip: PK 시그니처
    expect(result.data[0]).toBe(0x50);
    expect(result.data[1]).toBe(0x4b);
    expect(result.filename).toContain('.docx');
    expect(result.data.length).toBeGreaterThan(1000);
  });

  it('HTML은 escape된 마크업과 표를 포함하고 위험한 URL을 제거한다', async () => {
    const doc = {
      ...TECH_DOC,
      blocks: [
        ...TECH_DOC.blocks,
        {
          id: 'b9',
          type: 'paragraph',
          sortOrder: 9,
          content: { text: '<script>alert(1)</script> 본문' },
        },
        {
          id: 'b10',
          type: 'cta',
          sortOrder: 10,
          content: { text: '클릭', buttonLabel: '버튼', url: 'javascript:alert(1)' },
        },
      ],
    };
    const html = new TextDecoder().decode((await new HtmlExporter().export(doc)).data);
    expect(html).toContain('<table>');
    expect(html).toContain('PF보드');
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('javascript:');
  });
});

describe('갭③ 온톨로지 자동 추출', () => {
  it('사전 기반 엔티티/관계 추출이 동작한다', () => {
    const entities = extractEntities('욕실 도막방수 시공 후 결로 점검. 건축법 기준 확인.');
    const labels = entities.map((e) => e.label);
    expect(labels).toContain('욕실');
    expect(labels).toContain('도막방수');
    expect(labels).toContain('결로');
    expect(labels).toContain('건축법');

    const relations = extractRelations(entities);
    expect(
      relations.some((r) => r.sourceLabel === '도막방수' && r.targetLabel === '욕실'),
    ).toBe(true);
  });

  it('문서 추출 시 CANDIDATE 노드가 provenance와 함께 생성되고, 중복 라벨은 재사용된다', async () => {
    const { user, workspace } = await createUserWithWorkspace();
    const project = await createProject(user.id, { workspaceId: workspace.id, name: '추출 현장' });
    const doc = await createDocument(user.id, {
      projectId: project.id,
      title: '욕실 방수 기준',
      type: 'REPORT',
      withTemplate: false,
    });
    await addBlock(user.id, doc.id, {
      block: { type: 'paragraph', content: { text: '욕실 도막방수 시공 시 결로와 누수를 점검한다.' } },
    });

    const first = await extractFromDocument(user.id, doc.id);
    expect(first.nodesCreated).toBeGreaterThan(0);
    expect(first.edgesCreated).toBeGreaterThan(0);

    const nodes = await prisma.ontologyNode.findMany({ where: { workspaceId: workspace.id } });
    expect(nodes.every((n) => n.status === 'CANDIDATE')).toBe(true);
    const meta = nodes[0]!.metadata as { sources: { documentId: string }[] };
    expect(meta.sources[0]!.documentId).toBe(doc.id);

    // 같은 문서 재추출 → 새 노드 없이 연결만 증가
    const second = await extractFromDocument(user.id, doc.id);
    expect(second.nodesCreated).toBe(0);
    expect(second.nodesLinked).toBeGreaterThan(0);
  });
});

describe('갭④ 문서 템플릿', () => {
  it('REPORT 템플릿에 doc_meta/formula/table/qna가 포함된다', () => {
    const types = getTemplateBlocks('REPORT').map((b) => b.type);
    expect(types).toContain('doc_meta');
    expect(types).toContain('formula');
    expect(types).toContain('table');
    expect(types).toContain('qna');
    expect(types).toContain('source_reference');
  });

  it('withTemplate으로 문서 생성 시 블록이 자동 구성된다', async () => {
    const { user, workspace } = await createUserWithWorkspace();
    const project = await createProject(user.id, { workspaceId: workspace.id, name: '템플릿 현장' });
    const doc = await createDocument(user.id, {
      projectId: project.id,
      title: '템플릿 보고서',
      type: 'REPORT',
      withTemplate: true,
    });
    expect(doc.blocks.length).toBeGreaterThanOrEqual(10);
    expect(doc.blocks[0]!.type).toBe('doc_meta');
    // 순서 보존
    expect(doc.blocks.map((b) => b.sortOrder)).toEqual(doc.blocks.map((_, i) => i));
  });
});

describe('갭⑤ 멀티 에이전트 라우팅', () => {
  it('메시지가 역할별 에이전트로 라우팅된다', () => {
    expect(routeAgentRole('방화문 법규 알려줘').key).toBe('legal_agent');
    expect(routeAgentRole('욕실 방수 순서 알려줘').key).toBe('construction_agent');
    expect(routeAgentRole('거실 이미지 만들어줘').key).toBe('image_agent');
    expect(routeAgentRole('온톨로지 노드 정리해줘').key).toBe('knowledge_agent');
    expect(routeAgentRole('업무 진행률 알려줘').key).toBe('pm_agent');
    expect(routeAgentRole('블로그 초안 작성해줘').key).toBe('content_agent');
  });

  it('chat 응답에 에이전트 역할이 포함되고 메시지에도 기록된다', async () => {
    const { user, workspace } = await createUserWithWorkspace();
    const project = await createProject(user.id, { workspaceId: workspace.id, name: '역할 현장' });
    const doc = await createDocument(user.id, {
      projectId: project.id,
      title: '역할 테스트',
      type: 'BLOG_POST',
      withTemplate: false,
    });

    const result = await chat(user.id, {
      documentId: doc.id,
      selectedBlockIds: [],
      message: '상가 방화문 법규 알려줘',
    });
    expect(result.agentRole).toEqual({ key: 'legal_agent', label: '법규팀' });

    const message = await prisma.chatMessage.findFirst({
      where: { chatSessionId: result.chatSessionId, role: 'ASSISTANT' },
    });
    expect((message!.content as { agentRole: string }).agentRole).toBe('legal_agent');
  });
});
