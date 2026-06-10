'use client';

import type {
  ChartContent,
  ChecklistContent,
  CtaContent,
  HeadingContent,
  ImageContent,
  ParagraphContent,
  SourceReferenceContent,
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
        <div className="flex flex-col gap-1 rounded-lg border-l-4 border-zinc-400 bg-zinc-50 p-3">
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
