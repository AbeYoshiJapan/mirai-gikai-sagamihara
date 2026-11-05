"use client";

import type { CSSProperties } from "react";
import { useId, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { setDifficultyLevel } from "../../server/actions/set-difficulty-level";
import type { DifficultyLevelEnum } from "../../shared/types";
import {
  saveScrollDistanceFromBottom,
  useRestoreScrollFromBottom,
} from "../hooks/use-scroll-from-bottom";

interface DifficultySelectorProps {
  currentLevel: DifficultyLevelEnum;
  labelStyle?: CSSProperties;
  scrollToTop?: boolean;
  maintainScrollFromBottom?: boolean;
  /**
   * ヘッダー用。スマホ幅（sm 未満）ではラベルをスイッチの下に小さく出して横幅を節約し、
   * サイト名とキャッチコピーの場所を確保する。
   */
  compact?: boolean;
}

export function DifficultySelector({
  currentLevel,
  labelStyle,
  scrollToTop,
  maintainScrollFromBottom,
  compact = false,
}: DifficultySelectorProps) {
  const [selectedLevel, setSelectedLevel] =
    useState<DifficultyLevelEnum>(currentLevel);
  const uniqueId = useId();
  const [isChanging, setIsChanging] = useState(false);

  // ページロード時にスクロール位置を復元
  useRestoreScrollFromBottom(maintainScrollFromBottom ?? false);

  const handleToggle = async (checked: boolean) => {
    const newLevel = checked ? "hard" : "normal";
    setIsChanging(true);
    setSelectedLevel(newLevel);

    try {
      await setDifficultyLevel(newLevel);

      if (scrollToTop) {
        // スクロール位置をトップに戻す
        window.scrollTo(0, 0);
      } else if (maintainScrollFromBottom) {
        // 画面下端からの距離を保存
        saveScrollDistanceFromBottom();
      }

      // URLから ?difficulty パラメータを削除
      const url = new URL(window.location.href);
      if (url.searchParams.get("difficulty") !== null) {
        url.searchParams.delete("difficulty");
        // パラメータを削除したURLでリロード
        // ただし、スクロール位置は維持されない
        window.location.replace(url.toString());
      } else {
        // パラメータがない場合は通常のリロード
        // この場合はスクロール位置は維持される
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to update difficulty level:", error);
      // エラーの場合は元に戻す
      setSelectedLevel(currentLevel);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div
      className={
        compact
          ? "flex shrink-0 flex-col items-center gap-0.5 sm:flex-row sm:gap-2"
          : "flex items-center gap-2"
      }
    >
      <span
        className={
          compact
            ? "order-2 whitespace-nowrap text-[10px] font-bold leading-none sm:order-1 sm:text-sm sm:leading-normal"
            : "whitespace-nowrap text-sm font-bold"
        }
        style={labelStyle}
      >
        <span className="hidden md:inline-block">説明をもっと</span>
        詳しく
      </span>
      <Switch
        id={`${uniqueId}-difficulty-toggle`}
        checked={selectedLevel === "hard"}
        onCheckedChange={handleToggle}
        disabled={isChanging}
        aria-label="説明をもっと詳しく"
        className={compact ? "order-1 sm:order-2" : undefined}
      />
    </div>
  );
}
