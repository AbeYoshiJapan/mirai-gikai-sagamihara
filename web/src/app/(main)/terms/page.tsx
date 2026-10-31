import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layouts/container";
import {
  LegalList,
  LegalPageLayout,
  LegalParagraph,
  LegalSectionTitle,
  LegalSubSectionTitle,
} from "@/components/layouts/legal-page-layout";
import { EXTERNAL_LINKS } from "@/config/external-links";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "利用規約 | みらい議会@墨田区",
  description: "みらい議会@墨田区の利用規約",
};

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="利用規約"
      enLabel="Terms of Service"
      description="みらい議会@墨田区をご利用いただくにあたっての基本的なルールを定めています。"
      className="pt-24 md:pt-12"
    >
      <Container className="space-y-10">
        <LegalParagraph className="text-right">
          制定日：2026年10月22日
        </LegalParagraph>

        <LegalParagraph>
          「みらい議会@墨田区」（以下「本サービス」といいます。）は、墨田区議会議員の井上ひろき（以下「運営者」といいます。）が個人で運営するサイトです。本サービスは、墨田区および墨田区議会の公式サイトではありません。また、政党チームみらいが公開している「みらい議会」（AGPL-3.0）を元に作成したもので、チームみらいが運営するものではありません。
        </LegalParagraph>
        <LegalParagraph>
          本サービスをご利用いただく場合、以下の規約に同意いただいたものとみなします。
        </LegalParagraph>

        <section className="space-y-4">
          <LegalSectionTitle>第1条（禁止事項）</LegalSectionTitle>
          <LegalParagraph>
            利用する方は、本サービスの利用にあたり、以下の行為を行ってはなりません。
          </LegalParagraph>

          <LegalSubSectionTitle>不適切な入力</LegalSubSectionTitle>
          <LegalParagraph>
            AIへの入力・対話で、次の内容を含めることを禁止します。
          </LegalParagraph>
          <LegalList
            items={[
              "個人情報の入力：氏名、住所、電話番号、メールアドレス、SNSのID、口座番号、所属先など、本人・他人を問わず特定の個人がわかる情報",
              "法令違反：犯罪の予告、公職選挙法に違反する行為、その他法令に違反し、または違反を助長する行為",
              "権利侵害：他人の著作権、肖像権、プライバシー、名誉、信用を傷つける行為",
              "危害の予告：自殺・自傷の示唆、他人への脅迫",
              "公序良俗に反する内容：わいせつ・暴力的な表現、差別的な発言、ヘイトスピーチなど",
              "誹謗中傷：特定の個人や団体への人格否定、侮辱、嫌がらせ",
              "関係のない内容：本サービスの趣旨と無関係な入力",
              "虚偽情報の拡散：明らかな偽情報・誤情報で社会的な混乱を招くおそれのある行為",
              "宣伝・営業活動：商業目的の広告、特定のサイトへの誘導など",
            ]}
          />

          <LegalSubSectionTitle>
            システムの不正利用・運営の妨害
          </LegalSubSectionTitle>
          <LegalList
            items={[
              "本サービスの運営を妨げる行為、同じ内容を繰り返し送るなどの荒らし行為",
              "本サービスの情報を改ざん・加工し、誤解を招く形で使う行為",
              "サーバへの過剰な負荷、システムへの侵入・妨害",
              "自動化ツールやボットによる操作",
              "AIの悪用：内部の設定を聞き出そうとする行為、意図的に誤作動させる行為",
              "目的外の利用：墨田区議会・区政に関する本サービスの趣旨から著しく外れた応答をさせる行為",
              "なりすまし：他の人物や団体になりすまして利用する行為",
            ]}
          />
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第2条（違反への対応）</LegalSectionTitle>
          <LegalParagraph>
            運営者は、前条の禁止事項に当たると判断した場合、事前に通知することなく、対話ログや回答の削除、本サービスの利用の制限などの措置をとることができます。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>
            第3条（AIインタビューの回答の取り扱い）
          </LegalSectionTitle>
          <LegalList
            items={[
              "1. 議案や行政計画などへのAIインタビューで寄せられた回答と、その要約（以下「回答」といいます。）は、運営者が区議会での質問や政策提案を考える際の参考として使います。",
              "2. 回答は、墨田区の正式なパブリックコメントではありません。区に意見を届けたい場合は、区のパブリックコメントなど正式な手続きをご利用ください。",
              "3. 回答は、回答した方が公開に同意した場合に限り、本サービス上で公開します。公開するのは回答と要約で、回答した方がわかる情報は公開しません。同意しなかった回答は公開せず、第1項の目的にだけ使います。",
              {
                id: "open-data",
                content: (
                  <>
                    4. 公開に同意した回答は、「
                    <Link
                      href={routes.interviewDataTerms()}
                      className="text-primary-accent underline"
                    >
                      みらい議会@墨田区AIインタビューデータ利用規約
                    </Link>
                    」に基づき、誰でもダウンロードできるオープンデータとして第三者に提供します。公開をやめた場合、以後の提供は止めますが、既に取得された分の利用停止までは保証できません。
                  </>
                ),
              },
              "5. 運営者は、公開・非公開を問わず、個人がわからないように集計した結果（「〇〇という意見が多かった」など）を、区議会での発言や活動報告で紹介することがあります。",
              "6. 回答の著作権は、回答した方に残ります。回答した方は、運営者が第1項から第5項の範囲で回答を無償で利用し、また第三者に利用を許諾することを認め、著作者人格権を行使しないものとします。",
              "7. 公開した回答の公開をやめたい場合は、第8条の窓口からお知らせください。",
            ]}
            className="list-none pl-0"
          />
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第4条（知的財産権）</LegalSectionTitle>
          <LegalList
            items={[
              "1. 本サービスのプログラムは、「みらい議会」（AGPL-3.0）を改変したもので、同じライセンスに従います。",
              "2. 本サービスに掲載する解説文・画像の権利は、運営者または正当な権利者に帰属します。出典を示した引用など、法令で認められた範囲を超えて使う場合は、運営者にご相談ください。",
            ]}
            className="list-none pl-0"
          />
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第5条（情報の正確さ）</LegalSectionTitle>
          <LegalList
            items={[
              "1. 本サービスの議案・委員会の解説は、墨田区議会の会議録など公開されている一次資料を基に、AIを活用して整理したものです。運営者は内容の確認に努めますが、正確さ・完全さ・最新であることを保証しません。",
              "2. AIの応答は、誤った内容を含むことがあります。正確な情報は、墨田区議会の会議録や区の公式サイトでご確認ください。",
              "3. 誤りに気づいた場合は、第8条の窓口からお知らせください。",
            ]}
            className="list-none pl-0"
          />
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第6条（サービスの変更・停止）</LegalSectionTitle>
          <LegalList
            items={[
              "1. 運営者は、事前の通知なく本サービスの内容を変更し、または停止することがあります。これにより生じた損害について、運営者に故意または重大な過失がある場合を除き、責任を負いません。",
              "2. 運営者が立候補する選挙の期間中（告示日から投票日まで）は、本サービスの内容を更新しません。",
            ]}
            className="list-none pl-0"
          />
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第7条（規約の変更）</LegalSectionTitle>
          <LegalParagraph>
            運営者は、必要に応じて本規約を変更することがあります。変更後の規約は、本サービスに掲載した時点から効力を持ちます。
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第8条（お問い合わせ）</LegalSectionTitle>
          <LegalParagraph>
            本規約に関するお問い合わせ、誤りのお知らせは、運営者のLINE公式アカウントまでお寄せください。
          </LegalParagraph>
          <LegalParagraph>
            <a
              href={EXTERNAL_LINKS.CONTACT_LINE}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-accent underline"
            >
              {EXTERNAL_LINKS.CONTACT_LINE}
            </a>
          </LegalParagraph>
        </section>

        <section className="space-y-4">
          <LegalSectionTitle>第9条（準拠法・管轄）</LegalSectionTitle>
          <LegalParagraph>
            本規約は日本法に準拠し、本サービスに関して生じた紛争は、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
          </LegalParagraph>
        </section>
      </Container>
    </LegalPageLayout>
  );
}
