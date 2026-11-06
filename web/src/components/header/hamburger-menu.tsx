"use client";

import { Menu } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { routes } from "@/lib/routes";
import { RubyToggle } from "@/lib/rubyful";
import { useFuriganaSettings } from "@/lib/rubyful/use-furigana-settings";
import { useSiteSettings } from "@/lib/site-settings/provider";

type MenuLink = { label: string; href: string };

export function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const { features } = useSiteSettings();
  const furigana = useFuriganaSettings();

  const links: MenuLink[] = [];
  if (features.schedule) {
    links.push({ label: "会議の予定（カレンダー）", href: routes.schedule() });
  }
  links.push(
    { label: "このサイトについて", href: `${routes.home()}#about` },
    { label: "掲載方針", href: routes.editorialPolicy() }
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          aria-label="メニューを開く"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60" align="end">
        <nav aria-label="メニュー" className="flex flex-col">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href as Route}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-sm font-bold hover:bg-mirai-surface"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {furigana.available && (
          <div className="mt-2 border-t border-mirai-surface-muted px-2 pt-3">
            <RubyToggle />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
