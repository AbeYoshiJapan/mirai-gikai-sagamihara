import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { rehypeExternalLinks } from "@/lib/markdown/rehype-external-links";

/** 運営者の返信・回答（Markdown）。見出しは使わず、段落・箇条書き・リンク程度を想定 */
export function ReaderPostMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="flex flex-col gap-2 text-sm leading-[1.8] text-mirai-text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeExternalLinks]}
        components={{
          p: ({ children }) => <p className="m-0 text-pretty">{children}</p>,
          ul: ({ children }) => (
            <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="m-0 flex list-decimal flex-col gap-1 pl-5">
              {children}
            </ol>
          ),
          a: ({ node: _node, ...props }) => (
            <a {...props} className="text-primary-accent underline" />
          ),
          // 見出し記法が混ざっても段落として出す（ページの見出し構造を壊さない）
          h1: ({ children }) => <p className="m-0 font-bold">{children}</p>,
          h2: ({ children }) => <p className="m-0 font-bold">{children}</p>,
          h3: ({ children }) => <p className="m-0 font-bold">{children}</p>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
