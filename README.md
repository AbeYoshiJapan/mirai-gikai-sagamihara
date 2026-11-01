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
```

## 他の自治体で使う場合

このフォークをさらにフォークして別の自治体で運営する場合は、本家の [Fork ガイドライン](./FORK_GUIDELINES.md) を確認してください。ガイドラインにあるファイルの書き換えは、このフォークではほぼ「サイト設定」画面の入力に置き換わっています（ロゴ・色・サービス名・免責文言・ソースコード公開先リンク）。自治体ごとのプリセットは `packages/shared/src/site-settings/presets/` に追加できます。
