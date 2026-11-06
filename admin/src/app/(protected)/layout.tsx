import { Home, User } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "@/features/auth/client/components/logout-button";
import { getCurrentAdmin } from "@/features/auth/server/lib/auth-server";
import { loadSiteSettings } from "@/features/site-settings/server/loaders/load-site-settings";
import { routes } from "@/lib/routes";
import { NavigationLinks } from "./layout/navigation-links";

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await loadSiteSettings();
  return {
    title: `管理画面 | ${settings.site.name}`,
    description: `${settings.site.name}の管理者向け画面`,
  };
}

export default async function MainLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [admin, { settings }] = await Promise.all([
    getCurrentAdmin(),
    loadSiteSettings(),
  ]);
  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Home className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {settings.site.name} 管理画面
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-700">
                <User className="h-4 w-4" />
                <span className="hidden md:inline">{admin?.email}</span>
              </div>
              <LogoutButton />
            </div>
          </div>

          {/* Navigation */}
          <NavigationLinks />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {!settings.site.setup_completed && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>
              初期設定がまだ完了していません。公開サイトは「準備中」のまま表示されます。
            </span>
            <Link
              href={routes.setup()}
              className="font-medium text-amber-900 underline"
            >
              初期設定ウィザードを開く
            </Link>
          </div>
        )}
        {/* Main content */}
        <main>{children}</main>
      </div>
    </div>
  );
}
