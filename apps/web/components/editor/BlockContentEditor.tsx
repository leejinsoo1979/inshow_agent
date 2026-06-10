'use client';

import type {
  CalloutContent,
  ChartContent,
  ChecklistContent,
  CodeContent,
  ConstructionDetailContent,
  CostTableContent,
  CtaContent,
  DocMetaContent,
  FormulaContent,
  HeadingContent,
  ImageContent,
  LawReferenceContent,
  ParagraphContent,
  QnaContent,
  QuoteContent,
  SourceReferenceContent,
  TableContent,
} from '@archi/editor';
import { ChartView } from './ChartView';

type Props = {
  type: string;
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
};

/** 블록 타입별 인라인 편집 폼 */
export function BlockContentEditor({ type, content, onChange }: Props) {
  switch (type) {
    case 'heading': {
      const c = content as unknown as HeadingContent;
      return (
        <div className="flex items-start gap-2">
          <select
            value={c.level}
            onChange={(e) => onChange({ ...c, level: Number(e.target.value) })}
            className="rounded border border-zinc-200 px-1 py-0.5 text-xs text-zinc-500"
          >
            <option value={1}>H1</option>
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
          <input
            value={c.text}
            placeholder="제목을 입력하세요"
            onChange={(e) => onChange({ ...c, text: e.target.value })}
            className={`w-full bg-transparent font-bold outline-none ${
              c.level === 1 ? 'text-2xl' : c.level === 2 ? 'text-xl' : 'text-lg'
            }`}
          />
        </div>
      );
    }
    case 'paragraph': {
      const c = content as unknown as ParagraphContent;
      return (
        <textarea
          value={c.text}
          placeholder="내용을 입력하세요"
          onChange={(e) => onChange({ ...c, text: e.target.value })}
          rows={Math.max(2, Math.ceil(c.text.length / 60))}
          className="w-full resize-none bg-transparent leading-7 outline-none"
        />
      );
    }
    case 'image': {
      const c = content as unknown as ImageContent;
      return (
        <div className="flex flex-col gap-2">
          {c.url ? (
            <img src={c.url} alt={c.caption ?? '문서 이미지'} className="max-h-80 rounded-lg" />
          ) : (
            <div className="flex h-32 items-center justify-center rounded-lg bg-zinc-100 text-sm text-zinc-400">
              이미지 URL을 입력하거나 AI로 생성하세요
            </div>
          )}
          <input
            value={c.url ?? ''}
            placeholder="이미지 URL"
            onChange={(e) => onChange({ ...c, url: e.target.value })}
            className="rounded border border-zinc-200 px-2 py-1 text-sm"
          />
          <input
            value={c.caption ?? ''}
            placeholder="캡션"
            onChange={(e) => onChange({ ...c, caption: e.target.value })}
            className="rounded border border-zinc-200 px-2 py-1 text-sm text-zinc-600"
          />
        </div>
      );
    }
    case 'checklist': {
      const c = content as unknown as ChecklistContent;
      const items = c.items ?? [];
      return (
        <div className="flex flex-col gap-1.5">
          <input
            value={c.title ?? ''}
            placeholder="체크리스트 제목"
            onChange={(e) => onChange({ ...c, title: e.target.value })}
            className="font-semibold outline-none"
          />
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => {
                  const next = items.map((it, j) =>
                    j === i ? { ...it, checked: e.target.checked } : it,
                  );
                  onChange({ ...c, items: next });
                }}
              />
              <input
                value={item.text}
                placeholder="항목"
                onChange={(e) => {
                  const next = items.map((it, j) =>
                    j === i ? { ...it, text: e.target.value } : it,
                  );
                  onChange({ ...c, items: next });
                }}
                className="flex-1 bg-transparent outline-none"
              />
              <button
                type="button"
                onClick={() => onChange({ ...c, items: items.filter((_, j) => j !== i) })}
                className="text-xs text-zinc-400 hover:text-red-500"
                aria-label="항목 삭제"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...c, items: [...items, { text: '', checked: false }] })}
            className="self-start text-sm text-zinc-500 hover:text-zinc-900"
          >
            + 항목 추가
          </button>
        </div>
      );
    }
    case 'source_reference': {
      const c = content as unknown as SourceReferenceContent;
      return (
        <div className="flex flex-col gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <input
            value={c.title}
            placeholder="출처 제목"
            onChange={(e) => onChange({ ...c, title: e.target.value })}
            className="bg-transparent font-semibold outline-none"
          />
          <textarea
            value={c.summary ?? ''}
            placeholder="출처 요약"
            onChange={(e) => onChange({ ...c, summary: e.target.value })}
            rows={2}
            className="resize-none bg-transparent text-sm outline-none"
          />
          {(c.citations ?? []).length > 0 && (
            <p className="text-xs text-zinc-600">인용 {c.citations.length}건 연결됨</p>
          )}
        </div>
      );
    }
    case 'cta': {
      const c = content as unknown as CtaContent;
      return (
        <div className="flex flex-col gap-2 rounded-lg bg-zinc-900 p-4 text-white">
          <input
            value={c.text}
            placeholder="CTA 문구 (예: 무료 상담 신청하기)"
            onChange={(e) => onChange({ ...c, text: e.target.value })}
            className="bg-transparent font-semibold outline-none placeholder:text-zinc-400"
          />
          <div className="flex gap-2">
            <input
              value={c.buttonLabel ?? ''}
              placeholder="버튼 라벨"
              onChange={(e) => onChange({ ...c, buttonLabel: e.target.value })}
              className="flex-1 rounded bg-zinc-800 px-2 py-1 text-sm outline-none placeholder:text-zinc-500"
            />
            <input
              value={c.url ?? ''}
              placeholder="링크 URL"
              onChange={(e) => onChange({ ...c, url: e.target.value })}
              className="flex-1 rounded bg-zinc-800 px-2 py-1 text-sm outline-none placeholder:text-zinc-500"
            />
          </div>
        </div>
      );
    }
    case 'chart': {
      const c = content as unknown as ChartContent;
      return <ChartBlockEditor content={c} onChange={onChange} />;
    }
    case 'table': {
      const c = content as unknown as TableContent;
      return <TableBlockEditor content={c} onChange={onChange} />;
    }
    case 'formula': {
      const c = content as unknown as FormulaContent;
      return <FormulaBlockEditor content={c} onChange={onChange} />;
    }
    case 'doc_meta': {
      const c = content as unknown as DocMetaContent;
      return <DocMetaBlockEditor content={c} onChange={onChange} />;
    }
    case 'qna': {
      const c = content as unknown as QnaContent;
      return <QnaBlockEditor content={c} onChange={onChange} />;
    }
    case 'law_reference': {
      const c = content as unknown as LawReferenceContent;
      return (
        <div className="flex flex-col gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <input
            value={c.law}
            placeholder="법령명 (예: 건축물의 에너지절약설계기준)"
            onChange={(e) => onChange({ ...c, law: e.target.value })}
            className="bg-transparent font-semibold outline-none"
          />
          <div className="flex gap-2">
            <input
              value={c.article ?? ''}
              placeholder="조 (예: 제6조의2)"
              onChange={(e) => onChange({ ...c, article: e.target.value })}
              className="w-40 rounded border border-zinc-200 px-2 py-1 text-sm"
            />
            <input
              value={c.clause ?? ''}
              placeholder="항/호 (예: 1항)"
              onChange={(e) => onChange({ ...c, clause: e.target.value })}
              className="w-32 rounded border border-zinc-200 px-2 py-1 text-sm"
            />
          </div>
          <textarea
            value={c.summary ?? ''}
            placeholder="조문 요약"
            rows={2}
            onChange={(e) => onChange({ ...c, summary: e.target.value })}
            className="resize-none bg-transparent text-sm outline-none"
          />
          <input
            value={c.link ?? ''}
            placeholder="원문 링크 (법제처 등)"
            onChange={(e) => onChange({ ...c, link: e.target.value })}
            className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500"
          />
        </div>
      );
    }
    case 'callout': {
      const c = content as unknown as CalloutContent;
      return (
        <div className="flex flex-col gap-1.5 rounded-lg border border-zinc-300 bg-zinc-50 p-3">
          <div className="flex items-center gap-2">
            <select
              value={c.variant}
              onChange={(e) => onChange({ ...c, variant: e.target.value })}
              className="rounded border border-zinc-200 px-1 py-0.5 text-xs"
            >
              <option value="info">정보</option>
              <option value="tip">팁</option>
              <option value="warning">주의</option>
              <option value="danger">경고</option>
            </select>
            <input
              value={c.title ?? ''}
              placeholder="제목 (선택)"
              onChange={(e) => onChange({ ...c, title: e.target.value })}
              className="flex-1 bg-transparent font-semibold outline-none"
            />
          </div>
          <textarea
            value={c.text}
            placeholder="내용"
            rows={2}
            onChange={(e) => onChange({ ...c, text: e.target.value })}
            className="resize-none bg-transparent text-sm outline-none"
          />
        </div>
      );
    }
    case 'quote': {
      const c = content as unknown as QuoteContent;
      return (
        <div className="flex flex-col gap-1 border-l-4 border-zinc-300 pl-3">
          <textarea
            value={c.text}
            placeholder="인용 내용"
            rows={2}
            onChange={(e) => onChange({ ...c, text: e.target.value })}
            className="resize-none bg-transparent italic outline-none"
          />
          <input
            value={c.attribution ?? ''}
            placeholder="출처 / 저자"
            onChange={(e) => onChange({ ...c, attribution: e.target.value })}
            className="bg-transparent text-xs text-zinc-500 outline-none"
          />
        </div>
      );
    }
    case 'code': {
      const c = content as unknown as CodeContent;
      return (
        <div className="flex flex-col gap-1.5">
          <input
            value={c.language ?? ''}
            placeholder="언어 (예: ts, python)"
            onChange={(e) => onChange({ ...c, language: e.target.value })}
            className="w-40 rounded border border-zinc-200 px-2 py-1 text-xs"
          />
          <textarea
            value={c.code}
            placeholder="코드를 입력하세요"
            rows={4}
            spellCheck={false}
            onChange={(e) => onChange({ ...c, code: e.target.value })}
            className="rounded-md bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 outline-none"
          />
        </div>
      );
    }
    case 'cost_table': {
      const c = content as unknown as CostTableContent;
      return <CostTableBlockEditor content={c} onChange={onChange} />;
    }
    case 'construction_detail': {
      const c = content as unknown as ConstructionDetailContent;
      return <ConstructionDetailBlockEditor content={c} onChange={onChange} />;
    }
    default:
      return <p className="text-sm text-red-500">지원하지 않는 블록 타입: {type}</p>;
  }
}

/** 차트 블록 편집: 차트 미리보기 + 데이터 입력 (라벨/시리즈 CSV) */
function ChartBlockEditor({
  content,
  onChange,
}: {
  content: ChartContent;
  onChange: (content: Record<string, unknown>) => void;
}) {
  const series = content.series ?? [];

  function parseValues(raw: string): number[] {
    return raw
      .split(',')
      .map((v) => Number(v.trim()))
      .map((v) => (Number.isFinite(v) ? v : 0));
  }

  return (
    <div className="flex flex-col gap-3">
      <ChartView content={content} />
      <div className="flex flex-col gap-2 rounded-lg bg-zinc-50 p-3 text-sm">
        <div className="flex items-center gap-2">
          <select
            value={content.chartType}
            onChange={(e) => onChange({ ...content, chartType: e.target.value })}
            className="rounded border border-zinc-200 px-2 py-1 text-xs"
          >
            <option value="bar">막대</option>
            <option value="line">선</option>
            <option value="pie">파이</option>
          </select>
          <input
            value={content.title ?? ''}
            placeholder="차트 제목"
            onChange={(e) => onChange({ ...content, title: e.target.value })}
            className="flex-1 rounded border border-zinc-200 px-2 py-1 text-xs"
          />
        </div>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          라벨 (쉼표 구분)
          <input
            value={(content.labels ?? []).join(', ')}
            placeholder="예: 철거, 목공, 도장, 마감"
            onChange={(e) =>
              onChange({
                ...content,
                labels: e.target.value.split(',').map((label) => label.trim()).filter(Boolean),
              })
            }
            className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-900"
          />
        </label>
        {series.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={s.name ?? ''}
              placeholder={`시리즈 ${i + 1}`}
              onChange={(e) => {
                const next = series.map((it, j) => (j === i ? { ...it, name: e.target.value } : it));
                onChange({ ...content, series: next });
              }}
              className="w-24 rounded border border-zinc-200 px-2 py-1 text-xs"
            />
            <input
              value={s.values.join(', ')}
              placeholder="예: 120, 340, 200"
              onChange={(e) => {
                const next = series.map((it, j) =>
                  j === i ? { ...it, values: parseValues(e.target.value) } : it,
                );
                onChange({ ...content, series: next });
              }}
              className="flex-1 rounded border border-zinc-200 px-2 py-1 text-xs"
            />
            <button
              type="button"
              onClick={() => onChange({ ...content, series: series.filter((_, j) => j !== i) })}
              disabled={series.length <= 1}
              className="text-xs text-zinc-400 hover:text-red-500 disabled:opacity-30"
              aria-label="시리즈 삭제"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            onChange({
              ...content,
              series: [...series, { name: '', values: content.labels.map(() => 0) }],
            })
          }
          className="self-start text-xs text-zinc-500 hover:text-zinc-900"
        >
          + 시리즈 추가
        </button>
      </div>
    </div>
  );
}

/** 기준표/비교표 편집: 렌더링된 표 + 헤더/행 CSV 입력 */
function TableBlockEditor({
  content,
  onChange,
}: {
  content: TableContent;
  onChange: (content: Record<string, unknown>) => void;
}) {
  const headers = content.headers ?? [];
  const rows = content.rows ?? [];

  return (
    <div className="flex flex-col gap-2">
      <input
        value={content.title ?? ''}
        placeholder="표 제목 (예: 단열재별 두께 산정표)"
        onChange={(e) => onChange({ ...content, title: e.target.value })}
        className="font-semibold outline-none"
      />
      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-900 text-left text-white">
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-1.5 font-semibold">
                  {h || `열 ${i + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 1 ? 'bg-zinc-50' : ''}>
                {headers.map((_, ci) => (
                  <td key={ci} className="border-t border-zinc-100 px-3 py-1.5">
                    <input
                      value={row[ci] ?? ''}
                      onChange={(e) => {
                        const next = rows.map((r, j) =>
                          j === ri ? headers.map((__, k) => (k === ci ? e.target.value : (r[k] ?? ''))) : r,
                        );
                        onChange({ ...content, rows: next });
                      }}
                      className="w-full bg-transparent outline-none"
                    />
                  </td>
                ))}
                <td className="w-8 border-t border-zinc-100 text-center">
                  <button
                    type="button"
                    onClick={() => onChange({ ...content, rows: rows.filter((_, j) => j !== ri) })}
                    disabled={rows.length <= 1}
                    className="text-xs text-zinc-300 hover:text-red-500 disabled:opacity-30"
                    aria-label="행 삭제"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <label className="flex flex-1 items-center gap-2">
          헤더(쉼표 구분)
          <input
            value={headers.join(', ')}
            onChange={(e) => {
              const nextHeaders = e.target.value.split(',').map((h) => h.trim());
              onChange({
                ...content,
                headers: nextHeaders,
                rows: rows.map((r) => nextHeaders.map((_, i) => r[i] ?? '')),
              });
            }}
            className="flex-1 rounded border border-zinc-200 px-2 py-1 text-zinc-900"
          />
        </label>
        <button
          type="button"
          onClick={() => onChange({ ...content, rows: [...rows, headers.map(() => '')] })}
          className="hover:text-zinc-900"
        >
          + 행 추가
        </button>
      </div>
    </div>
  );
}

/** 계산식 편집: 수식, 변수 설명, 결과 */
function FormulaBlockEditor({
  content,
  onChange,
}: {
  content: FormulaContent;
  onChange: (content: Record<string, unknown>) => void;
}) {
  const variables = content.variables ?? [];
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <input
        value={content.title ?? ''}
        placeholder="계산식 제목 (예: 열관류율 계산)"
        onChange={(e) => onChange({ ...content, title: e.target.value })}
        className="bg-transparent text-sm font-semibold outline-none"
      />
      <input
        value={content.expression}
        placeholder="예: U = 1 / Rtotal"
        onChange={(e) => onChange({ ...content, expression: e.target.value })}
        className="rounded-md bg-zinc-900 px-3 py-2 font-mono text-sm text-white outline-none"
      />
      {variables.map((v, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <input
            value={v.symbol}
            placeholder="기호"
            onChange={(e) => {
              const next = variables.map((it, j) => (j === i ? { ...it, symbol: e.target.value } : it));
              onChange({ ...content, variables: next });
            }}
            className="w-16 rounded border border-zinc-200 px-2 py-1 font-mono"
          />
          <input
            value={v.meaning}
            placeholder="의미"
            onChange={(e) => {
              const next = variables.map((it, j) => (j === i ? { ...it, meaning: e.target.value } : it));
              onChange({ ...content, variables: next });
            }}
            className="flex-1 rounded border border-zinc-200 px-2 py-1"
          />
          <input
            value={v.unit ?? ''}
            placeholder="단위"
            onChange={(e) => {
              const next = variables.map((it, j) => (j === i ? { ...it, unit: e.target.value } : it));
              onChange({ ...content, variables: next });
            }}
            className="w-20 rounded border border-zinc-200 px-2 py-1"
          />
          <button
            type="button"
            onClick={() => onChange({ ...content, variables: variables.filter((_, j) => j !== i) })}
            className="text-zinc-400 hover:text-red-500"
            aria-label="변수 삭제"
          >
            ✕
          </button>
        </div>
      ))}
      <div className="flex items-center gap-3 text-xs">
        <button
          type="button"
          onClick={() =>
            onChange({ ...content, variables: [...variables, { symbol: '', meaning: '', unit: '' }] })
          }
          className="text-zinc-500 hover:text-zinc-900"
        >
          + 변수 추가
        </button>
        <input
          value={content.result ?? ''}
          placeholder="결과/예시 값 (선택)"
          onChange={(e) => onChange({ ...content, result: e.target.value })}
          className="flex-1 rounded border border-zinc-200 px-2 py-1"
        />
      </div>
    </div>
  );
}

const REVIEW_STATUS_LABELS: Record<string, string> = {
  draft: '작성 중',
  review: '검수 대기',
  approved: '검수 완료',
};

/** 문서 메타 편집: 문서코드/버전/작성자/발행일/검수 상태 */
function DocMetaBlockEditor({
  content,
  onChange,
}: {
  content: DocMetaContent;
  onChange: (content: Record<string, unknown>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs sm:grid-cols-5">
      <label className="flex flex-col gap-1 text-zinc-400">
        문서코드
        <input
          value={content.docCode ?? ''}
          placeholder="ARC-INS-002"
          onChange={(e) => onChange({ ...content, docCode: e.target.value })}
          className="rounded border border-zinc-200 bg-white px-2 py-1 font-mono text-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-zinc-400">
        버전
        <input
          value={content.version ?? ''}
          placeholder="v1.0"
          onChange={(e) => onChange({ ...content, version: e.target.value })}
          className="rounded border border-zinc-200 bg-white px-2 py-1 text-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-zinc-400">
        작성자
        <input
          value={content.author ?? ''}
          onChange={(e) => onChange({ ...content, author: e.target.value })}
          className="rounded border border-zinc-200 bg-white px-2 py-1 text-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-zinc-400">
        발행일
        <input
          value={content.publishedAt ?? ''}
          placeholder="2026-06-10"
          onChange={(e) => onChange({ ...content, publishedAt: e.target.value })}
          className="rounded border border-zinc-200 bg-white px-2 py-1 text-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-zinc-400">
        검수 상태
        <select
          value={content.reviewStatus ?? 'draft'}
          onChange={(e) => onChange({ ...content, reviewStatus: e.target.value })}
          className="rounded border border-zinc-200 bg-white px-2 py-1 text-zinc-900"
        >
          {Object.entries(REVIEW_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

/** 현장 Q&A 편집 */
function QnaBlockEditor({
  content,
  onChange,
}: {
  content: QnaContent;
  onChange: (content: Record<string, unknown>) => void;
}) {
  const items = content.items ?? [];
  return (
    <div className="flex flex-col gap-2">
      <input
        value={content.title ?? ''}
        placeholder="Q&A 제목 (예: 현장 질문)"
        onChange={(e) => onChange({ ...content, title: e.target.value })}
        className="font-semibold outline-none"
      />
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-zinc-200 p-3 text-sm">
          <div className="mb-1 flex items-start gap-2">
            <span className="mt-0.5 font-bold text-zinc-900">Q.</span>
            <input
              value={item.question}
              placeholder="질문"
              onChange={(e) => {
                const next = items.map((it, j) => (j === i ? { ...it, question: e.target.value } : it));
                onChange({ ...content, items: next });
              }}
              className="flex-1 font-medium outline-none"
            />
            <button
              type="button"
              onClick={() => onChange({ ...content, items: items.filter((_, j) => j !== i) })}
              disabled={items.length <= 1}
              className="text-xs text-zinc-400 hover:text-red-500 disabled:opacity-30"
              aria-label="Q&A 삭제"
            >
              ✕
            </button>
          </div>
          <div className="mb-1 flex items-start gap-2">
            <span className="mt-0.5 font-bold text-zinc-400">A.</span>
            <textarea
              value={item.answer}
              placeholder="답변"
              rows={2}
              onChange={(e) => {
                const next = items.map((it, j) => (j === i ? { ...it, answer: e.target.value } : it));
                onChange({ ...content, items: next });
              }}
              className="flex-1 resize-none text-zinc-700 outline-none"
            />
          </div>
          <input
            value={item.basis ?? ''}
            placeholder="근거 (법규 조항, 시방서 등 · 선택)"
            onChange={(e) => {
              const next = items.map((it, j) => (j === i ? { ...it, basis: e.target.value } : it));
              onChange({ ...content, items: next });
            }}
            className="w-full rounded bg-zinc-50 px-2 py-1 text-xs text-zinc-500 outline-none"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange({ ...content, items: [...items, { question: '', answer: '', basis: '' }] })
        }
        className="self-start text-sm text-zinc-500 hover:text-zinc-900"
      >
        + 질문 추가
      </button>
    </div>
  );
}

/** 견적/비용표 편집: 항목별 수량·단가 + 합계 자동 계산 */
function CostTableBlockEditor({
  content,
  onChange,
}: {
  content: CostTableContent;
  onChange: (content: Record<string, unknown>) => void;
}) {
  const items = content.items ?? [];
  const currency = content.currency || '원';
  const total = items.reduce((sum, it) => sum + (it.quantity || 0) * (it.unitPrice || 0), 0);
  const fmt = (n: number) => n.toLocaleString('ko-KR');
  return (
    <div className="flex flex-col gap-2">
      <input
        value={content.title ?? ''}
        placeholder="견적 제목 (예: 거실 리모델링 견적)"
        onChange={(e) => onChange({ ...content, title: e.target.value })}
        className="font-semibold outline-none"
      />
      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-900 text-left text-white">
              <th className="px-3 py-1.5 font-semibold">항목</th>
              <th className="px-3 py-1.5 font-semibold">규격</th>
              <th className="px-3 py-1.5 font-semibold">수량</th>
              <th className="px-3 py-1.5 font-semibold">단위</th>
              <th className="px-3 py-1.5 font-semibold">단가</th>
              <th className="px-3 py-1.5 text-right font-semibold">금액</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => {
              const update = (patch: Partial<typeof it>) =>
                onChange({
                  ...content,
                  items: items.map((x, j) => (j === i ? { ...x, ...patch } : x)),
                });
              return (
                <tr key={i} className={i % 2 === 1 ? 'bg-zinc-50' : ''}>
                  <td className="border-t border-zinc-100 px-3 py-1.5">
                    <input value={it.name} onChange={(e) => update({ name: e.target.value })} className="w-full bg-transparent outline-none" />
                  </td>
                  <td className="border-t border-zinc-100 px-3 py-1.5">
                    <input value={it.spec ?? ''} onChange={(e) => update({ spec: e.target.value })} className="w-full bg-transparent outline-none" />
                  </td>
                  <td className="border-t border-zinc-100 px-3 py-1.5">
                    <input type="number" value={it.quantity ?? 0} onChange={(e) => update({ quantity: Number(e.target.value) })} className="w-16 bg-transparent outline-none" />
                  </td>
                  <td className="border-t border-zinc-100 px-3 py-1.5">
                    <input value={it.unit ?? ''} onChange={(e) => update({ unit: e.target.value })} className="w-14 bg-transparent outline-none" />
                  </td>
                  <td className="border-t border-zinc-100 px-3 py-1.5">
                    <input type="number" value={it.unitPrice ?? 0} onChange={(e) => update({ unitPrice: Number(e.target.value) })} className="w-24 bg-transparent outline-none" />
                  </td>
                  <td className="border-t border-zinc-100 px-3 py-1.5 text-right tabular-nums">
                    {fmt((it.quantity || 0) * (it.unitPrice || 0))}
                  </td>
                  <td className="border-t border-zinc-100 text-center">
                    <button
                      type="button"
                      onClick={() => onChange({ ...content, items: items.filter((_, j) => j !== i) })}
                      className="text-xs text-zinc-300 hover:text-red-500"
                      aria-label="항목 삭제"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-zinc-300 font-semibold">
              <td colSpan={5} className="px-3 py-1.5 text-right">합계</td>
              <td className="px-3 py-1.5 text-right tabular-nums">
                {fmt(total)} {currency}
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() =>
          onChange({
            ...content,
            items: [...items, { name: '', spec: '', quantity: 1, unit: '', unitPrice: 0 }],
          })
        }
        className="self-start text-sm text-zinc-500 hover:text-zinc-900"
      >
        + 항목 추가
      </button>
    </div>
  );
}

/** 시공 상세 편집: 상세도 이미지 + 단계별 절차 + 주의사항 */
function ConstructionDetailBlockEditor({
  content,
  onChange,
}: {
  content: ConstructionDetailContent;
  onChange: (content: Record<string, unknown>) => void;
}) {
  const steps = content.steps ?? [];
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3">
      <input
        value={content.title ?? ''}
        placeholder="상세 제목 (예: 결로방지 단열 상세)"
        onChange={(e) => onChange({ ...content, title: e.target.value })}
        className="font-semibold outline-none"
      />
      {content.imageUrl ? (
        <img src={content.imageUrl} alt={content.title ?? '시공 상세도'} className="max-h-60 rounded-lg" />
      ) : (
        <input
          value={content.imagePrompt ?? ''}
          placeholder="상세도 이미지 프롬프트 (AI 생성) 또는 아래 URL"
          onChange={(e) => onChange({ ...content, imagePrompt: e.target.value })}
          className="rounded border border-zinc-200 px-2 py-1 text-sm"
        />
      )}
      <input
        value={content.imageUrl ?? ''}
        placeholder="상세도 이미지 URL"
        onChange={(e) => onChange({ ...content, imageUrl: e.target.value })}
        className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500"
      />
      <ol className="flex flex-col gap-1">
        {steps.map((step, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className="font-bold text-zinc-400">{i + 1}.</span>
            <input
              value={step}
              placeholder="시공 절차"
              onChange={(e) =>
                onChange({ ...content, steps: steps.map((s, j) => (j === i ? e.target.value : s)) })
              }
              className="flex-1 bg-transparent outline-none"
            />
            <button
              type="button"
              onClick={() => onChange({ ...content, steps: steps.filter((_, j) => j !== i) })}
              className="text-xs text-zinc-400 hover:text-red-500"
              aria-label="절차 삭제"
            >
              ✕
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={() => onChange({ ...content, steps: [...steps, ''] })}
        className="self-start text-sm text-zinc-500 hover:text-zinc-900"
      >
        + 절차 추가
      </button>
      <textarea
        value={content.notes ?? ''}
        placeholder="주의사항 / 비고"
        rows={2}
        onChange={(e) => onChange({ ...content, notes: e.target.value })}
        className="resize-none rounded bg-zinc-50 px-2 py-1 text-xs text-zinc-600 outline-none"
      />
    </div>
  );
}
