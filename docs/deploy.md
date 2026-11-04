# 本番への設置手順（Supabase + Vercel）

みらい議会＠相模原市を本番に置く手順です。Docker は不要で、手元に必要なのは Node 22・pnpm 10 と、このリポジトリを `git clone` したフォルダだけです。
順序は **Supabase（DB と認証）→ Vercel（web と admin の 2 プロジェクト）→ 管理画面で初期設定と取込** です。

## 1. Supabase（本番プロジェクト）

1. [supabase.com/dashboard](https://supabase.com/dashboard) で **New project**。Region は Northeast Asia (Tokyo)。DB パスワードは控えておきます
   （無料プランで足ります。1 週間アクセスが無いと一時停止されるので、公開が近づいたら Pro を検討）。
2. **Project Settings → API Keys** で Project URL・Publishable key（`sb_publishable_…`）・Secret key（`sb_secret_…`）を控えます。
3. 手元のリポジトリのフォルダで次を実行します（`supabase login` はブラウザで認可、`link` で DB パスワードを聞かれます）。

   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>   # ref は Project Settings → General の Project ID
   npx supabase db push                    # supabase/migrations をすべて適用。site-assets バケットもここで作られる
   ```

4. **Authentication → Sign In / Providers → Email**：「Allow new users to sign up」をオフ。**Anonymous sign-ins** もオフ
   （ローカルの `supabase/config.toml` はオンのままで構いません）。
5. **Authentication → URL Configuration**：Site URL に admin の URL、Redirect URLs に `https://<admin ドメイン>/api/auth/callback`
   （Vercel の URL が決まってから）。
6. **Authentication → Users → Add user**（メール＋パスワード、Auto Confirm User をオン）→ **SQL Editor** で admin ロールを付与します。
   admin ロールはこの手作業でしか付きません。

   ```sql
   update auth.users
   set raw_app_meta_data = raw_app_meta_data || '{"roles": ["admin"]}'::jsonb
   where email = '<作成したユーザーのメール>';
   ```

## 2. Vercel（web と admin）

1. [vercel.com/new](https://vercel.com/new) で GitHub のこのリポジトリを **2 回** import します。
   - 1 つ目：Project Name `mirai-gikai-sagamihara-web`、Root Directory `web`
   - 2 つ目：Project Name `mirai-gikai-sagamihara-admin`、Root Directory `admin`
   - Framework Preset は Next.js（自動検出）、Install Command は `pnpm install --frozen-lockfile`、Production Branch は `main`
2. 下の環境変数を Production に入れてから Deploy します（入れ忘れても Settings → Environment Variables で追加して Redeploy すれば大丈夫です）。
3. web と admin の URL が決まったら、`NEXT_PUBLIC_WEB_URL`・`ADMIN_URL` を両プロジェクトに入れ直し、Supabase の Redirect URLs（1-5）を合わせて Redeploy します。
4. admin は Supabase のログイン（admin ロール）で守られていますが、二重の守りとして **Settings → Deployment Protection → Vercel Authentication** を有効にしておきます
   （自分の Vercel アカウントでログインした人しか開けなくなります。プランによっては本番の独自ドメインは対象外です）。
5. 独自ドメインを使うなら web だけ **Settings → Domains** で割り当てます。admin は `*.vercel.app` のままで差し支えありません。

### 環境変数

◎ は必須、○ は任意、− は不要。「両方同じ値」のものは web と admin で一字も違えないでください。

| 変数 | web | admin | 値 |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ◎ | ◎ | Supabase の Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ◎ | ◎ | Publishable key（`sb_publishable_…`） |
| `SUPABASE_URL` | ◎ | ◎ | Project URL（上と同じ値） |
| `SUPABASE_SECRET_KEY` | ◎ | ◎ | Secret key（`sb_secret_…`）。サーバー側だけで使われ、ブラウザには出ません |
| `REVALIDATE_SECRET` | ◎ | ◎ | 32 文字以上のランダム文字列。両方同じ値（admin が web のキャッシュを更新するときの合言葉） |
| `SITE_PREVIEW_SECRET` | ○ | ○ | 公開前の web を管理者だけが見るための合言葉。両方同じ値。未設定なら `REVALIDATE_SECRET` が使われます |
| `NEXT_PUBLIC_WEB_URL` | ◎ | ◎ | `https://<web ドメイン>`（末尾スラッシュなし） |
| `ADMIN_URL` | ◎ | ◎ | `https://<admin ドメイン>` |
| `AI_GATEWAY_API_KEY` | − | ◎ | Vercel AI Gateway のキー（解説生成だけで使う）。Vercel ダッシュボードの AI Gateway → API Keys で発行 |
| `READER_POST_SLACK_WEBHOOK_URL` | ○ | − | 意見・質問フォームの通知先 Slack Incoming Webhook |
| `ARTICLE_REPORT_SLACK_WEBHOOK_URL` | ○ | − | 誤り報告の通知先。意見・質問の通知先が未設定ならこちらが使われます |
| `IP_HASH_SALT` | ○ | − | 投稿者 IP のハッシュ用 salt。未設定なら `REVALIDATE_SECRET` |
| `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` | ○ | − | 公開前に web 全体を Basic 認証で隠したいときだけ。公開時に消します |
| `NEXT_PUBLIC_GA_TRACKING_ID` | ○ | − | Google Analytics を使うなら |
| `OPEN_DATA_RATE_LIMIT_PER_IP` / `OPEN_DATA_RATE_LIMIT_GLOBAL` | ○ | − | オープンデータ API の上限（既定値のままでよい） |
| `ADMIN_MCP_TOKEN` | − | ○ | Claude Code などから `/api/mcp` を使うときだけ。未設定なら MCP は全部拒否されます |
| `CHAT_*`・`LANGFUSE_*`・`GCP_*`・`SUPABASE_AUTH_EXTERNAL_GOOGLE_*`・`ADMIN_AUTH_CALLBACK_URL` | − | − | 本家由来。チャット・Langfuse・Cloud Run・Google ログインは使いません（`ADMIN_AUTH_CALLBACK_URL` はローカルの config.toml 用） |

## 3. 管理画面で初期設定 → 取込 → 公開

1. admin の URL を開き、1-6 で作ったユーザーでログインします。初回は `/setup` ウィザードが出るので「相模原市議会のひな形」を選び、
   運営者欄・テーマ色・ロゴ・**ソースコードの公開先 URL**（このリポジトリの URL。AGPL 第 13 条）を入力します。「公開中」はまだオフのままにします。
2. 「会期管理」で令和 8 年（2026 年度）の会期を作り、有効にします。
3. 「取込」で `tools/import` が作った取込 JSON（例：`2026-09-agenda.json`）を選び、差分プレビューを確認して適用します。続けて審議結果（`2026-09-results.json`）。
   議案は下書きで入ります。
4. 「サイト設定」の公開前プレビューのリンクから web を開き、トップ・議案一覧・議案詳細・「議会に正式に届けるには」を確認します。
5. 公開前チェックリスト（`FORK_GUIDELINES.md` と計画書）を埋め、「サイト設定」→「サイト」→「公開中」をオン。`BASIC_AUTH_*` を入れていたら消して Redeploy します。
6. Search Console にプロパティを登録し、`https://<web ドメイン>/sitemap.xml` を送信します。

## 補足

- 以後のデプロイは Vercel の GitHub 連携に任せます（`main` への push で web・admin が自動でビルドされます）。
  マイグレーションを足したときだけ `npx supabase db push` を手で実行します。順序は **DB が先、コードが後** です。
- 本家由来の `deploy.yml`・`deploy_worker.yml`・`supabase_preview.yml` は手動実行だけにしてあり、Cloud Run の worker（トピック分析）は使いません。
- バックアップ：無料プランには自動バックアップが無いので、`npx supabase db dump --data-only -f backup.sql` を週 1 で取るか、Pro にして日次バックアップを使います。
