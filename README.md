# みらい議会＠相模原市

相模原市議会で審議されている議案を、市民にわかりやすく伝えるサイトのソースコードです。

- 本家 [みらい議会](https://gikai.team-mir.ai/)（[team-mirai/mirai-gikai](https://github.com/team-mirai/mirai-gikai)、AGPL-3.0）を、[みらい議会＠墨田区](https://github.com/h-inoue1209/mirai-gikai-sumida) 経由でフォークしたものです
- **これは政党チームみらいが運営しているものではありません**
- ライセンスは本家と同じ [AGPL-3.0](./LICENSE) です。このリポジトリが、稼働中のサイトのソースコード公開先です（AGPL 第13条）
- 本家からの改変日: 2026-11-01（以降の変更は Git の履歴を参照してください）

## このフォークで変えたこと

本家・墨田区版はサイト名・自治体名・色・リンク・規約文がコードに直接書かれていました。このフォークでは、それらをすべて **管理画面の「サイト設定」** から変えられるようにし、他の自治体でもコードを書き換えずに立ち上げられるようにしています。

| 変更 | 場所 |
|------|------|
| サイト設定（DB `site_settings` ＋ zod スキーマ ＋ 既定値 ＋ 相模原市議会プリセット） | `packages/shared/src/site-settings/` |
| 管理画面「サイト設定」（10 タブ、セクション単位の保存と変更履歴） | admin `/settings` |
| 初期設定ウィザード（プリセット → サイト・議会 → 運営者 → 見た目・リンク → 機能・公開） | admin `/setup` |
| フォークガイドライン・AGPL の点検（サイト名形式・本家の色・ソース公開先・改変日） | `packages/shared/src/site-settings/compliance.ts` |
| 機能フラグ（AI チャット・AI インタビュー・トピック分析・オープンデータ API などを個別に ON/OFF。OFF の機能はページも API も 404） | 「サイト設定」→「機能」 |
| 公開前は「準備中」ページ。管理者は合言葉付きリンクで中を確認できる | `/api/site-preview` |
| 規約・プライバシーポリシー・免責・請願/陳情の案内文を Markdown テンプレートで管理 | 「サイト設定」→「規約・文言」 |
| 「議会に正式に届けるには」ページ（請願・陳情・パブリックコメントの案内） | web `/petition-guide` |
| 地方議会向けの議案区分（委員会報告・行政計画・特別委員会）を管理画面に反映 | admin 議案編集 |
| AI 解説の生成（一次資料から下書きを作り、「要確認」を解消してから公開） | admin 議案 →「AI で解説を生成」 |
| 意見フォーム・質問フォーム（投稿は非公開で届き、管理者が確認してから公開） | web 議案詳細・`/questions`、admin「意見・質問」 |
| 議会サイトの PDF からの取込（付議事件一覧・議案書・陳情・審議結果 → 取込 JSON → 管理画面で差分を確認して適用） | `tools/import/`、admin「取込」 |

利用者が AI と直接やり取りする機能（AI チャット・AI インタビュー）と、AI による自動生成の公開は **既定で OFF** です。解説文の生成はこれまでどおり管理画面の中だけで行い、公開には管理者の確認が必要です。

## セットアップ

```bash
# Supabaseの起動
npx supabase start

# 環境変数の設定（必要に応じて.envの内容を変更してください）
cp .env.example .env

# パッケージインストール
pnpm install

# SupabaseのDB初期化, 開発用シードデータのセットアップ
pnpm db:reset

# サーバー起動
pnpm dev
```

`pnpm db:reset` の seed には相模原市議会プリセットのサイト設定（公開中・初期設定完了）が入るので、起動直後から `http://localhost:3000` でサイトが表示されます。

## 立ち上げ後の最初の設定

1. 管理画面（`http://localhost:3001`）に Admin ユーザーでログイン
2. 画面上部の案内から **初期設定ウィザード**（`/setup`）を開き、「相模原市議会のひな形」を選んで順に入力
   - 運営者の氏名・肩書き・連絡先・SNS
   - テーマ色（本家の `#2aa693` / `#2a5ea8` は使えません）とロゴ・OGP 画像
   - **このサイトのソースコードの公開先 URL**（必須。AGPL 第13条）
   - 公開サイトに出す機能
3. 「会期管理」で会期を、「議案管理」で議案を登録
4. 「サイト設定」→「サイト」→「公開中」をオン

ウィザードを終えたあとの変更は、すべて「サイト設定」（`/settings`）から行えます。保存すると公開サイトのキャッシュがすぐに更新されます。

## 環境変数

本家の `.env.example` に加えて、次を使います。

| 変数 | 用途 |
|------|------|
| `SITE_PREVIEW_SECRET` | 公開前（「公開中」オフ）のサイトを管理者が確認するための合言葉。web と admin の両方に同じ値を設定。未設定なら `REVALIDATE_SECRET` を使う |
| `READER_POST_SLACK_WEBHOOK_URL` | 意見・質問フォームの投稿を Slack に通知する Incoming Webhook（任意。未設定なら `ARTICLE_REPORT_SLACK_WEBHOOK_URL`） |
| `IP_HASH_SALT` | 投稿の連投対策で IP アドレスをハッシュ化するときの salt（任意。未設定なら `REVALIDATE_SECRET`）。生の IP は保存しない |

## マイグレーション

```bash
# マイグレーションファイル生成
npx supabase migration new マイグレーション名

# マイグレーション実行 & 型ファイル更新
pnpm db:migrate
```

## Adminユーザーの作成

1. Supabase Studio上で Authentication > Add User からユーザーを作成
2. Supabase Studio上で以下のSQLを実行

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"roles": ["admin"]}'::jsonb
WHERE email = '<1で作成したユーザーのemail>';
```

> [!NOTE]
> ローカル開発環境では、`pnpm seed`（`pnpm db:reset` からも実行されます）によって `email: admin@example.com, password: admin123456` のAdminユーザーが作成されます。
> このAdminユーザーは `SUPABASE_URL` が localhost を指している場合のみ作成され、ホスト環境（staging・preview ブランチ等）には作成されません。
> メールアドレス・パスワードを変えたい場合は `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` を設定してください。

## 開発時の確認

```bash
pnpm lint
pnpm typecheck
pnpm test
# ローカル Supabase を起動した状態で（DB トリガー・MCP・リポジトリの統合テスト）
pnpm test:integration
```

Docker が使えない環境では、`scripts/check-migrations.mjs` で PGlite（WASM 版 PostgreSQL）にマイグレーションを当て、
公開ゲート・審議段階・意見/質問フォームのトリガーと制約の動作を確かめられます（使い方はファイル先頭のコメント）。

## 議案のデータモデル（地方議会向け）

| 列 | 意味 |
|----|------|
| `bill_kind` | 議案の種類（条例・予算・決算・契約・人事・請願・陳情・委員会報告・行政計画 など） |
| `proposer_kind` | 提出者（市長・議員・委員会・市民） |
| `committee_id` | 付託先の委員会（`committees` テーブル。管理画面「委員会」） |
| `stage` | 審議段階（提出前 → 提出 → 委員会付託 → 委員会審査中 → 本会議採決待ち → 議決済み） |
| `result` / `vote_outcome` / `decided_on` | 議決の結果（可決・否決・承認・同意・採択・不採択・継続審査・撤回）、採決（全会一致・賛成多数…）、議決日 |
| `status` | 本家由来の列。トリガー `sync_bill_legacy_status` が `stage` などから導出する（直接編集しない） |
| `bill_sources` | 一次資料（議案書 PDF・会議録・審議結果・中継）。公開ページの「一次資料」欄 |
| `factions` / `members` / `vote_records` | 会派・議員と賛否。表示は機能フラグ `faction_votes` / `member_votes` |

### 公開ゲート

議案を「公開中」にできるのは管理画面の公開操作だけです。記事レビュー完了（`is_review_completed`）と確認日時（`reviewed_at`）が無い議案は、
DB のトリガー `enforce_publish_gate` が公開を拒否します。取込・MCP・生成は下書きまでで、インタビューレポートやトピック分析の自動公開もありません。

### AI 解説の生成と確認

管理画面の「AI で解説を生成」は、登録した一次資料（議案書・会議録など）の本文から、やさしい解説・詳しい解説・タグ候補・用語候補の
**下書き** を作ります（`generation_jobs` に履歴とコストを記録）。生成結果には AI 自身が「要確認」と印を付けた箇所が付き、
管理者がすべて解消して「記事レビュー完了」にするまで公開できません。生成した解説を適用すると、その議案のレビュー完了は自動で外れます。
月間コストの上限は「サイト設定」→「AI」で決めます。

### 議会サイトからの取込

[tools/import](./tools/import/README.md) の Python ツールが、相模原市議会サイトの付議事件一覧・議案集・陳情・審議結果の
PDF を読んで取込 JSON（`mirai-gikai-import/1`）を作ります。管理画面「取込」でその JSON をアップロードすると、
既存の議案と突き合わせた差分（追加・更新・変更なし）が出るので、確認してから適用します。

- 追加される議案は **下書き** です。公開は解説を確認してから管理画面の公開操作で行います
- 既存の件名・区分は上書きしません（空の付託先・番号・提出日だけ埋め、審議段階は前にだけ進めます）
- 議案書 PDF は一次資料（`bill_sources`）に登録し、抽出した本文を「AI で解説を生成」の材料にします
- 審議結果の JSON は、段階・結果・採決・議決日を更新します
- 実行は `import_runs` に記録されます。GitHub Actions の `import.yml` は週 1 回 dry run で JSON を artifact に残すだけで、DB には書きません

### 意見フォーム・質問フォーム

機能フラグ `opinion_form` / `question_form` を ON にすると、議案詳細に「この議案への意見」「この議案への質問と回答」が出ます
（議案に紐づかない質問と、公開した Q&A の一覧は `/questions`）。

- 投稿は `reader_opinions` / `reader_questions` に **非公開（received）** で入り、Slack に通知できます。公開ページに自動で出ることはありません
- 管理画面「意見・質問」で内容を確認し、返信・回答を書いて公開します。公開できるのは **投稿者が公開に同意した** 投稿だけで、質問は回答が無いと公開できません（どちらも DB の CHECK 制約）
- 連絡先（メール）は管理画面にだけ出ます。IP アドレスは salt 付きハッシュだけを持ちます（連投対策）。同じ IP から 10 分に 5 件、全体で 100 件までの制限があります
- フォームの下には「このサイトへの投稿は議会への正式な意思表示ではない」旨と、請願・陳情の案内（`/petition-guide`）へのリンクが常に出ます

## 他の自治体で使う場合

このフォークをさらにフォークして別の自治体で運営する場合は、本家の [Fork ガイドライン](./FORK_GUIDELINES.md) を確認してください。ガイドラインにあるファイルの書き換えは、このフォークではほぼ「サイト設定」画面の入力に置き換わっています（ロゴ・色・サービス名・免責文言・ソースコード公開先リンク）。自治体ごとのプリセットは `packages/shared/src/site-settings/presets/` に追加できます。
