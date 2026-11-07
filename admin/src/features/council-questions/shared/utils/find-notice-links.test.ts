import { describe, expect, it } from "vitest";
import { findNoticeLinks } from "./find-notice-links";

// 相模原市議会「提出議案・発言通告」ページ（令和8年9月定例会議のとき）の形
const PAGE = `
<h2>付議事件一覧</h2>
<ul><li><a href="file_contents/2026_hugi_0930.pdf">令和８年定例会９月定例会議　付議事件一覧[PDF：209KB]</a></li></ul>
<h3>代表質問・個人質疑通告一覧</h3>
<ul><li><a href="file_contents/2026_tsukoku_09.pdf">令和８年定例会９月定例会議　代表質問・個人質疑通告一覧[PDF：458KB]</a></li></ul>
<h3>一般質問通告一覧</h3>
<ul>
<li><a class="pdf" href="file_contents/2026_juni_09.pdf">令和８年定例会９月定例会議　一般質問順位[PDF：78.7KB]</a></li>
<li><a href="/doc/2013120900011/file_contents/2026_ippantsukoku_09.pdf">令和８年定例会９月定例会議　<span>一般質問通告一覧</span>[PDF：434KB]</a></li>
</ul>
<a href="https://get.adobe.com/jp/reader/">Adobe Reader</a>
`;

const BASE = "https://www.sagamihara-shigikai.jp/doc/2013120900011/";

describe("findNoticeLinks", () => {
  it("通告一覧と一般質問順位の PDF を、定例会議ごとに見つける", () => {
    expect(findNoticeLinks(PAGE, BASE)).toEqual([
      {
        meetingKey: "2026-09",
        meetingName: "令和8年9月定例会議",
        representativeUrl: `${BASE}file_contents/2026_tsukoku_09.pdf`,
        generalUrl: `${BASE}file_contents/2026_ippantsukoku_09.pdf`,
        orderUrl: `${BASE}file_contents/2026_juni_09.pdf`,
      },
    ]);
  });

  it("新しい定例会議を先に並べ、通告一覧の無いページでは空", () => {
    const twoMeetings = `${PAGE}
<a href="old/2026_ippantsukoku_6.pdf">令和８年定例会６月定例会議　一般質問通告一覧</a>`;
    expect(findNoticeLinks(twoMeetings, BASE).map((m) => m.meetingKey)).toEqual(
      ["2026-09", "2026-06"]
    );
    expect(findNoticeLinks("<p>準備中</p>", BASE)).toEqual([]);
  });
});
