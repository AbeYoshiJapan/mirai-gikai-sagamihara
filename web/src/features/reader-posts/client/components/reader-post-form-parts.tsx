"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const TEXTAREA_CLASS =
  "block field-sizing-fixed resize-y border-mirai-border bg-white px-3 py-2.5 text-[13px] leading-[1.6] text-mirai-text shadow-none placeholder:text-mirai-text-placeholder md:text-[13px] focus:outline-solid focus:outline-2 focus:outline-offset-0 focus:outline-mirai-text-slate focus-visible:border-mirai-border focus-visible:ring-0";

export const INPUT_CLASS =
  "h-9 border-mirai-border bg-white px-3 text-[13px] text-mirai-text shadow-none placeholder:text-mirai-text-placeholder md:text-[13px] focus-visible:border-mirai-border focus-visible:ring-0 focus:outline-solid focus:outline-2 focus:outline-offset-0 focus:outline-mirai-text-slate";

/** 選択肢をトグルボタンで並べる（賛否・居住地・年代） */
export function ChoiceButtons<T extends string>({
  legend,
  options,
  value,
  onChange,
  disabled,
  allowDeselect = true,
}: {
  legend: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T | null) => void;
  disabled?: boolean;
  allowDeselect?: boolean;
}) {
  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="mb-1.5 w-full text-xs font-bold text-mirai-text-subtle">
        {legend}
      </legend>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Button
            key={option.value}
            type="button"
            variant="outline"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() =>
              onChange(selected && allowDeselect ? null : option.value)
            }
            className={cn(
              "h-auto min-h-9 px-3 py-0 bg-white text-[13px] font-bold shadow-none hover:bg-white",
              selected
                ? "border-mirai-text bg-mirai-text text-white hover:bg-mirai-text"
                : "border-mirai-border text-mirai-text"
            )}
          >
            {option.label}
          </Button>
        );
      })}
    </fieldset>
  );
}

/** 公開への同意など、チェックボックス 1 つの行 */
export function ConsentCheckbox({
  id,
  checked,
  onChange,
  disabled,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-2 text-[13px] leading-[1.6] text-mirai-text"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-4 shrink-0 accent-mirai-text"
      />
      <span>{children}</span>
    </label>
  );
}

/** 送信後のお礼表示 */
export function SentMessage({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-[12px] border bg-white px-3.5 py-3"
    >
      <Check
        className="size-4 shrink-0 mt-0.5 text-mirai-text"
        strokeWidth={2.5}
      />
      <p className="text-[13px] font-medium leading-[1.6] text-mirai-text">
        {children}
      </p>
    </div>
  );
}

/** キャンセル・送信ボタンの行 */
export function FormActions({
  canSubmit,
  isPending,
  hasBody,
  onCancel,
}: {
  canSubmit: boolean;
  isPending: boolean;
  hasBody: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        type="button"
        variant="ghost"
        disabled={isPending}
        onClick={onCancel}
        className="h-auto min-h-10 px-3.5 py-0 bg-transparent text-[13px] font-bold text-mirai-text-muted hover:bg-transparent hover:text-mirai-text-muted hover:opacity-70"
      >
        キャンセル
      </Button>
      <Button
        type="submit"
        disabled={!canSubmit}
        className={cn(
          "h-auto min-h-10 px-5 py-0 border-0 text-[13px] font-bold shadow-none disabled:opacity-100",
          hasBody
            ? "bg-mirai-text text-white hover:bg-mirai-text"
            : "bg-mirai-surface-muted text-mirai-text-muted"
        )}
      >
        {isPending ? "送信中…" : "送信する"}
      </Button>
    </div>
  );
}

/** フォームを開く前の導線ボタン */
export function OpenFormButton({
  onOpen,
  children,
}: {
  onOpen: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onOpen}
      className="h-auto min-h-11 w-full border-mirai-text bg-white px-5 py-0 text-[14px] font-bold text-mirai-text shadow-none hover:bg-mirai-surface md:w-auto"
    >
      {children}
    </Button>
  );
}
