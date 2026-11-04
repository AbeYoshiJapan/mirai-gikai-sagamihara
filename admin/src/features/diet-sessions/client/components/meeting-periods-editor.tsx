"use client";

import { MAX_MEETING_PERIODS } from "@mirai-gikai/shared/diet-sessions/meeting-periods";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MeetingPeriod } from "../../shared/types";

/** フォーム上の 1 行。React のキー用に id を持つ（保存時に落とす） */
export type MeetingPeriodRow = MeetingPeriod & { id: string };

type MeetingPeriodsEditorProps = {
  value: MeetingPeriodRow[];
  onChange: (next: MeetingPeriodRow[]) => void;
  disabled?: boolean;
  /** 会議期間の呼び方（例: 定例会議）。見出しとプレースホルダに使う */
  sessionLabel?: string;
};

let rowSeq = 0;
function newRowId(): string {
  rowSeq += 1;
  return `period-${Date.now().toString(36)}-${rowSeq.toString(36)}`;
}

/** DB の期間をフォームの行にする */
export function toMeetingPeriodRows(
  periods: MeetingPeriod[]
): MeetingPeriodRow[] {
  return periods.map((p) => ({ ...p, id: newRowId() }));
}

/** フォームの行から送る値を作る。id を落とし、空行（名前も日付も空）も落とす */
export function compactMeetingPeriods(
  rows: MeetingPeriodRow[]
): MeetingPeriod[] {
  return rows
    .map((p) => ({
      name: p.name.trim(),
      start_date: p.start_date,
      end_date: p.end_date,
    }))
    .filter((p) => p.name !== "" || p.start_date !== "" || p.end_date !== "");
}

/**
 * 会期の中の会議期間（定例会議・臨時会議）を行で編集する。
 * 公開サイトはここで入れた期間を優先し、空なら会議予定の本会議名から期間を導く。
 */
export function MeetingPeriodsEditor({
  value,
  onChange,
  disabled,
  sessionLabel = "定例会議",
}: MeetingPeriodsEditorProps) {
  const update = (id: string, patch: Partial<MeetingPeriod>) => {
    onChange(value.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };
  const remove = (id: string) => {
    onChange(value.filter((p) => p.id !== id));
  };
  const add = () => {
    if (value.length >= MAX_MEETING_PERIODS) return;
    onChange([
      ...value,
      { id: newRowId(), name: "", start_date: "", end_date: "" },
    ]);
  };

  return (
    <div className="space-y-2">
      <div>
        <Label>{sessionLabel}などの期間</Label>
        <p className="mt-1 text-xs text-gray-500">
          {`会期の中で本会議を開く期間（例: 6月${sessionLabel}）。公開サイトの「次の${sessionLabel}の開会まで○日」はここから計算します。空なら会議予定の本会議名から自動で求めます。`}
        </p>
      </div>
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((period, index) => (
            <div
              key={period.id}
              className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto] md:items-center"
            >
              <Input
                type="text"
                value={period.name}
                onChange={(e) => update(period.id, { name: e.target.value })}
                placeholder={`例: 12月${sessionLabel}`}
                aria-label={`${index + 1}件目の期間の名前`}
                disabled={disabled}
              />
              <Input
                type="date"
                value={period.start_date}
                onChange={(e) =>
                  update(period.id, { start_date: e.target.value })
                }
                aria-label={`${index + 1}件目の期間の開始日`}
                disabled={disabled}
              />
              <Input
                type="date"
                value={period.end_date}
                onChange={(e) =>
                  update(period.id, { end_date: e.target.value })
                }
                aria-label={`${index + 1}件目の期間の終了日`}
                disabled={disabled}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(period.id)}
                disabled={disabled}
                aria-label={`${index + 1}件目の期間を削除`}
              >
                削除
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        disabled={disabled || value.length >= MAX_MEETING_PERIODS}
      >
        期間を追加
      </Button>
    </div>
  );
}
