"use client";

import {
  type DeliberationTimeline,
  type DeliberationTiming,
  getDeliberationTiming,
} from "@mirai-gikai/shared/bill-stage/deliberation-timing";
import { createContext, type ReactNode, useContext } from "react";

const DeliberationTimelineContext = createContext<DeliberationTimeline | null>(
  null
);

/** 議案の「審議中・継続中・審議予定」を決めるための材料を、画面全体に渡す */
export function DeliberationTimelineProvider({
  value,
  children,
}: {
  value: DeliberationTimeline | null;
  children: ReactNode;
}) {
  return (
    <DeliberationTimelineContext.Provider value={value}>
      {children}
    </DeliberationTimelineContext.Provider>
  );
}

/**
 * 議案がいま「審議中・継続中・審議予定」のどれか。材料が無ければ null（従来どおり「審議中」）。
 */
export function useDeliberationTiming(bill: {
  submitted_date?: string | null;
  diet_session_id?: string | null;
}): DeliberationTiming | null {
  const timeline = useContext(DeliberationTimelineContext);
  return timeline ? getDeliberationTiming(bill, timeline) : null;
}
