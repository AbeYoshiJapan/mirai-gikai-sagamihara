"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { TextSelectionWrapper } from "@/features/bills/client/components/text-selection-tooltip/text-selection-wrapper";
import {
  ChatButton,
  type ChatButtonRef,
} from "@/features/chat/client/components/chat-button";
import type { BillWithContent } from "../../../shared/types";

interface BillDetailClientProps {
  bill: BillWithContent;
  currentDifficulty: DifficultyLevelEnum;
  hasInterviewConfig: boolean;
  /** サイト設定の features.ai_chat。false なら本文選択→質問の導線もチャットボタンも出さない */
  chatEnabled?: boolean;
  children: ReactNode;
}

/**
 * 議案詳細のクライアントサイド機能を管理するコンポーネント
 *
 * 実装背景:
 * - テキスト選択からのAIチャット連携機能を提供
 * - Server Componentである BillDetailLayout から切り出すことで
 *   SSRを保持しつつクライアントサイド機能を実装
 */
export function BillDetailClient({
  bill,
  currentDifficulty,
  hasInterviewConfig,
  chatEnabled = false,
  children,
}: BillDetailClientProps) {
  const chatButtonRef = useRef<ChatButtonRef>(null);

  const handleOpenChat = (selectedText: string) => {
    chatButtonRef.current?.openWithText(selectedText);
  };

  if (!chatEnabled) {
    return <>{children}</>;
  }

  return (
    <>
      <TextSelectionWrapper onOpenChat={handleOpenChat}>
        {children}
      </TextSelectionWrapper>

      {/* チャット機能 */}
      <ChatButton
        ref={chatButtonRef}
        billContext={bill}
        hasInterviewConfig={hasInterviewConfig}
        difficultyLevel={currentDifficulty}
      />
    </>
  );
}
