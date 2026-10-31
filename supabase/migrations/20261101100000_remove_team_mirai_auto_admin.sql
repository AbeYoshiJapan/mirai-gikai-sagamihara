-- 墨田区版：本家の「@team-mir.ai の Google ログインに自動で admin を付ける」仕組みを外す。
-- 墨田区版の管理者は運営者のアカウントだけにし、admin ロールは手で付ける。
DROP TRIGGER IF EXISTS on_auth_user_created_set_admin_role ON auth.users;
DROP FUNCTION IF EXISTS public.handle_google_workspace_admin_role();
DROP FUNCTION IF EXISTS public.apply_admin_role_if_eligible(uuid);
