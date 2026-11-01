import { Container } from "@/components/layouts/container";
import { LegalPageLayout } from "@/components/layouts/legal-page-layout";
import { parseMarkdown } from "@/lib/markdown";

interface LegalMarkdownPageProps {
  title: string;
  enLabel: string;
  description?: string;
  /** テンプレート展開済みの Markdown（サイト設定の文言・法務タブ） */
  markdown: string;
}

/**
 * 利用規約・プライバシーポリシーなど、サイト設定の Markdown をそのまま出すページ。
 */
export async function LegalMarkdownPage({
  title,
  enLabel,
  description,
  markdown,
}: LegalMarkdownPageProps) {
  const content = await parseMarkdown(markdown);

  return (
    <LegalPageLayout
      title={title}
      enLabel={enLabel}
      description={description}
      className="pt-24 md:pt-12"
    >
      <Container>
        <div
          className="
            markdown-content max-w-none text-[15px] leading-loose tracking-wide
            [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:tracking-wider
            [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-bold
            [&_p]:mb-4
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4
            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4
            [&_li]:mb-2
            [&_a]:!underline [&_a]:!underline-offset-[3px]
            [&_a:hover]:opacity-70
          "
        >
          {content}
        </div>
      </Container>
    </LegalPageLayout>
  );
}
