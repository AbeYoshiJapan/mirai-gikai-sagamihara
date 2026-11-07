import { describe, expect, it } from "vitest";
import type { NoticeItem } from "../types";
import { formatItemsOutline, parseItemsOutline } from "./items-outline";

const ITEMS: NoticeItem[] = [
  {
    label: "1",
    level: 1,
    text: "ＡＩの活用による行政のＤＸ推進について",
    children: [
      {
        label: "(1)",
        level: 2,
        text: "現状について",
        children: [
          {
            label: "ア",
            level: 3,
            text: "これまでの取組と総括",
            children: [
              {
                label: "（ア）",
                level: 4,
                text: "議案第９９号について",
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  { label: "2", level: 1, text: "物価高騰対策について", children: [] },
];

describe("項目の書き直し", () => {
  it("字下げした文字にして、そのまま元に戻せる（文言の全角数字はそのまま）", () => {
    const text = formatItemsOutline(ITEMS);
    expect(text).toBe(
      [
        "1 ＡＩの活用による行政のＤＸ推進について",
        "  (1) 現状について",
        "    ア これまでの取組と総括",
        "      （ア） 議案第９９号について",
        "2 物価高騰対策について",
      ].join("\n")
    );
    expect(parseItemsOutline(text)).toEqual({ ok: true, items: ITEMS });
  });

  it("全角の番号や字下げなしでも読み、番号の無い行は知らせる", () => {
    const result = parseItemsOutline(
      "１　物価高騰対策について\n（１）市の考え方について\n"
    );
    expect(result).toEqual({
      ok: true,
      items: [
        {
          label: "1",
          level: 1,
          text: "物価高騰対策について",
          children: [
            {
              label: "(1)",
              level: 2,
              text: "市の考え方について",
              children: [],
            },
          ],
        },
      ],
    });
    expect(
      parseItemsOutline(
        "1 行政ＤＸについて\n(1) 計画について\nア 具体的な取組\n（イ） 生成ＡＩの活用について\nａ ガイドラインの作成\n（ａ） 職員の研修"
      )
    ).toMatchObject({
      ok: true,
      items: [
        {
          children: [
            {
              children: [
                {
                  children: [
                    {
                      label: "（イ）",
                      children: [
                        {
                          label: "ａ",
                          level: 5,
                          text: "ガイドラインの作成",
                          children: [
                            { label: "（ａ）", level: 6, text: "職員の研修" },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(parseItemsOutline("1 項目\n続きの文")).toMatchObject({ ok: false });
    expect(parseItemsOutline("(1) 上の項目が無い")).toMatchObject({
      ok: false,
    });
    expect(parseItemsOutline("  \n")).toMatchObject({ ok: false });
  });
});
