"use client";

import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";

interface StringListFieldProps {
  value: string[];
  onChange: (value: string[]) => void;
  onBlur?: () => void;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
}

export function linesToList(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * 1 行 1 項目のテキストエリア。
 * 入力中の改行を保つため文字列は手元で持ち、フォームには配列を返す。
 */
export function StringListField({
  value,
  onChange,
  onBlur,
  rows,
  placeholder,
  disabled,
}: StringListFieldProps) {
  const [text, setText] = useState(() => value.join("\n"));

  // プリセット適用などで外から配列が変わったら表示も合わせる
  useEffect(() => {
    const joined = value.join("\n");
    setText((current) =>
      linesToList(current).join("\n") === joined ? current : joined
    );
  }, [value]);

  return (
    <Textarea
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(linesToList(e.target.value));
      }}
      onBlur={onBlur}
      rows={rows ?? 4}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}
