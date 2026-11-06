import { describe, expect, it } from "vitest";
import { SAGAMIHARA_COMMITTEES } from "../site-settings/presets/sagamihara";
import {
  type CommitteeForMeeting,
  resolveMeetingLabel,
} from "./resolve-meeting-label";

const committees: CommitteeForMeeting[] = SAGAMIHARA_COMMITTEES.map((c, i) => ({
  id: `c${i}`,
  name: c.name,
  short_name: c.short_name,
  kind: c.kind,
}));

describe("resolveMeetingLabel", () => {
  it("本会議・予備日・議運", () => {
    expect(resolveMeetingLabel("本会議", committees)).toEqual({
      name: "本会議",
      category: "plenary",
      committeeId: null,
      recognized: true,
    });
    expect(resolveMeetingLabel("本会議予備日", committees).name).toBe(
      "本会議（予備日）"
    );
    expect(resolveMeetingLabel("議運", committees)).toEqual({
      name: "議会運営委員会",
      category: "steering",
      committeeId: "c5",
      recognized: true,
    });
  });

  it("委員会の略称は、登録した委員会の名前にする（相模原市議会の初期データ）", () => {
    expect(resolveMeetingLabel("総務", committees)).toEqual({
      name: "総務委員会",
      category: "standing",
      committeeId: "c0",
      recognized: true,
    });
    expect(resolveMeetingLabel("市民環境経済", committees).name).toBe(
      "市民環境経済委員会"
    );
    expect(resolveMeetingLabel("こども文教", committees).name).toBe(
      "こども文教委員会"
    );
    expect(resolveMeetingLabel("予算特別", committees)).toMatchObject({
      name: "予算特別委員会",
      category: "special",
    });
  });

  it("知らない略称は、詳細ページの見出しがあればそれを名前にする", () => {
    expect(
      resolveMeetingLabel("大都市", committees, "大都市制度・行財政改革特別委員会")
    ).toEqual({
      name: "大都市制度・行財政改革特別委員会",
      category: "special",
      committeeId: null,
      recognized: true,
    });
  });

  it("手がかりが無ければ、そのままの名前・区分「その他」で、確認が要る印を付ける", () => {
    expect(resolveMeetingLabel("広報", committees)).toEqual({
      name: "広報",
      category: "other",
      committeeId: null,
      recognized: false,
    });
  });
});
