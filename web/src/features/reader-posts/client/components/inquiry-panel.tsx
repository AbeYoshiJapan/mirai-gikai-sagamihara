"use client";

import {
  READER_POST_BODY_MAX_LENGTH,
  READER_QUESTION_CONTACT_MAX_LENGTH,
  READER_QUESTION_KIND_LABELS,
  READER_QUESTION_KINDS,
  type ReaderQuestionKind,
} from "@mirai-gikai/shared/reader-posts/labels";
import { MessageCircle } from "lucide-react";
import { type ReactNode, useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { submitReaderQuestion } from "../../server/actions/submit-reader-question";
import { READER_POST_FAILED_MESSAGE } from "../../shared/types";
import { INQUIRY_KIND_TEXTS } from "../../shared/utils/inquiry-texts";
import { hasReaderPostBody } from "../../shared/utils/reader-opinion-input";
import {
  ChoiceButtons,
  ConsentCheckbox,
  INPUT_CLASS,
  SentMessage,
  TEXTAREA_CLASS,
} from "./reader-post-form-parts";

const KIND_OPTIONS = READER_QUESTION_KINDS.map((kind) => ({
  value: kind,
  label: READER_QUESTION_KIND_LABELS[kind],
}));

/** 質問か意見を選んで、運営者に送るフォーム（議案に紐づかない） */
function InquiryForm({ notice }: { notice: ReactNode }) {
  const id = useId();
  const [kind, setKind] = useState<ReaderQuestionKind>("question");
  const [body, setBody] = useState("");
  const [contact, setContact] = useState("");
  const [consentToPublish, setConsentToPublish] = useState(false);
  const [sentKind, setSentKind] = useState<ReaderQuestionKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const texts = INQUIRY_KIND_TEXTS[kind];
  const hasBody = hasReaderPostBody(body);

  const submit = () => {
    if (!hasBody || isPending) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await submitReaderQuestion({
          body,
          contact,
          consentToPublish,
          kind,
        });
        if (result.ok) {
          setSentKind(kind);
          setBody("");
          setContact("");
          setConsentToPublish(false);
        } else {
          setError(result.error);
        }
      } catch {
        setError(READER_POST_FAILED_MESSAGE);
      }
    });
  };

  if (sentKind) {
    return (
      <div className="flex flex-col items-start gap-2">
        <SentMessage>{INQUIRY_KIND_TEXTS[sentKind].thanks}</SentMessage>
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-[13px] text-primary-accent"
          onClick={() => setSentKind(null)}
        >
          続けて送る
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <ChoiceButtons
        legend="送るもの"
        options={KIND_OPTIONS}
        value={kind}
        onChange={(value) => value && setKind(value)}
        allowDeselect={false}
        disabled={isPending}
      />

      <div>
        <label
          htmlFor={`${id}-body`}
          className="mb-1.5 block text-xs font-bold text-mirai-text-subtle"
        >
          {texts.bodyLabel}（必須・{READER_POST_BODY_MAX_LENGTH}文字まで）
        </label>
        <Textarea
          id={`${id}-body`}
          required
          aria-required="true"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={texts.placeholder}
          rows={4}
          maxLength={READER_POST_BODY_MAX_LENGTH}
          disabled={isPending}
          className={TEXTAREA_CLASS}
        />
      </div>

      <div>
        <label
          htmlFor={`${id}-contact`}
          className="mb-1.5 block text-xs font-bold text-mirai-text-subtle"
        >
          返信先メールアドレス（任意・公開されません）
        </label>
        <Input
          id={`${id}-contact`}
          type="email"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="example@example.com"
          maxLength={READER_QUESTION_CONTACT_MAX_LENGTH}
          disabled={isPending}
          className={INPUT_CLASS}
        />
      </div>

      <ConsentCheckbox
        id={`${id}-consent`}
        checked={consentToPublish}
        onChange={setConsentToPublish}
        disabled={isPending}
      >
        {texts.consent}
      </ConsentCheckbox>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!hasBody || isPending}
          className={cn(
            "h-auto min-h-10 border-0 px-5 py-0 text-[13px] font-bold shadow-none disabled:opacity-100",
            hasBody
              ? "bg-mirai-text text-white hover:bg-mirai-text"
              : "bg-mirai-surface-muted text-mirai-text-muted"
          )}
        >
          {isPending ? "送信中…" : "送信する"}
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-[13px] leading-[1.6] text-destructive">
          {error}
        </p>
      )}

      {notice}
    </form>
  );
}

/**
 * トップの「質問・意見の窓」。パソコンでは右側に常に出し、スマートフォンでは下のボタンから開く。
 * 送られたものは運営者に届き、運営者が確認して返事を付けたものだけが公開される。
 */
export function InquiryPanel({
  intro,
  notice,
}: {
  /** だれが対応しているかを示す紹介文（サイト設定から） */
  intro: string;
  /** 送り先と、正式な意思表示ではないことの注意書き */
  notice: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside
        aria-label="質問・意見を送る"
        className="fixed right-4 bottom-4 z-40 hidden max-h-[calc(100dvh-128px)] w-[450px] flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-md pc:flex xl:right-[calc(calc(100%-1180px)/2)]"
      >
        <p className="text-[17px] font-bold leading-[1.7] text-mirai-text">
          {intro}
        </p>
        <InquiryForm notice={notice} />
      </aside>

      <div className="fixed right-4 bottom-4 z-40 pc:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              className="h-12 rounded-full bg-mirai-text px-5 text-sm font-bold text-white shadow-lg hover:bg-mirai-text"
            >
              <MessageCircle className="size-5" />
              質問・意見を送る
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="max-h-[85dvh] gap-4 overflow-y-auto rounded-t-2xl bg-white p-5"
          >
            <SheetTitle className="pr-8 text-base font-bold text-mirai-text">
              質問・意見を送る
            </SheetTitle>
            <SheetDescription className="text-[15px] leading-[1.7] text-mirai-text">
              {intro}
            </SheetDescription>
            <InquiryForm notice={notice} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
