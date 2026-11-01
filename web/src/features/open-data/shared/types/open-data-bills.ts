import type {
  Bill,
  BillStatusEnum,
  HouseEnum,
  StanceTypeEnum,
} from "@/features/bills/shared/types";

export type OpenDataMiraiStance = {
  /** 賛否の種別（for / against など） */
  type: StanceTypeEnum;
  /** 賛否種別の日本語ラベル（賛成 / 反対 など） */
  label: string;
  /** 賛否についての補足コメント */
  comment: string | null;
};

export type OpenDataBillTag = {
  id: string;
  label: string;
};

export type OpenDataBillItem = {
  billId: string;
  /** 議案の正式名称 */
  name: string;
  /** わかりやすいタイトル（難易度別コンテンツ由来） */
  title: string;
  /** 議案の概要（難易度別コンテンツ由来） */
  summary: string;
  /** 議案番号（例: 議案第99号） */
  billNumber: string | null;
  /** 議案の種類（ordinance / budget / petition など） */
  billKind: Bill["bill_kind"];
  billKindLabel: string;
  /** 提出者の区分（mayor / member / committee / citizen） */
  proposerKind: Bill["proposer_kind"];
  proposerKindLabel: string;
  /** 審議段階（preparing / submitted / referred / in_committee / plenary / decided）。報告・計画は null */
  stage: Bill["stage"];
  stageLabel: string | null;
  /** 議決の結果（passed / rejected / continued など）。未議決は null */
  result: Bill["result"];
  resultLabel: string | null;
  /** 採決の結果（unanimous / majority / minority / none） */
  voteOutcome: Bill["vote_outcome"];
  /** 議決日 */
  decidedOn: string | null;
  /**
   * 旧来の審議状況（国会由来の値）。stage / result から導出した互換値で、
   * 新しい利用者は stage / result を使うこと
   * @deprecated
   */
  status: BillStatusEnum;
  /** 審議状況の日本語ラベル（審議中 / 可決（賛成多数） など） */
  statusLabel: string;
  statusNote: string | null;
  /**
   * 旧来の提出院。一院制の地方議会では常に HR
   * @deprecated
   */
  originatingHouse: HouseEnum;
  submittedDate: string | null;
  publishedAt: string | null;
  tags: OpenDataBillTag[];
  /** チームみらいの賛否。未表明の場合は null */
  miraiStance: OpenDataMiraiStance | null;
  createdAt: string;
};

export type OpenDataBillsResult = {
  items: OpenDataBillItem[];
  nextCursor: string | null;
};

export type OpenDataBillDetail = OpenDataBillItem & {
  /** 議案の本文解説（Markdown、難易度別コンテンツ由来） */
  content: string;
};
