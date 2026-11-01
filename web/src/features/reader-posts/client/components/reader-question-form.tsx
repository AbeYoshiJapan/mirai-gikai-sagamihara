"use client";

import {
  READER_POST_BODY_MAX_LENGTH,
  READER_QUESTION_CONTACT_MAX_LENGTH,
} from "@mirai-gikai/shared/reader-posts/labels";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitReaderQuestion } from "../../server/actions/submit-reader-question";
import { READER_POST_FAILED_MESSAGE } from "../../shared/types";
import { hasReaderPostBody } from "../../shared/utils/reader-opinion-input";
import {
  ConsentCheckbox,
  FormActions,
  INPUT_CLASS,
  OpenFormButton,
  SentMessage,
  TEXTAREA_CLASS,
} from "./reader-post-form-parts";

type Step = "idle" | "form" | "sent";

export function ReaderQuestionForm({
  billId,
  openLabel = "この議案について質問する",
}: {
  /** 議案に紐づかない一般の質問なら省略 */
  billId?: string;
  openLabel?: string;
}) {
  const [step, setStep] = useState<Step>("idle");
  const [body, setBody] = useState("");
  const [contact, setContact] = useState("");
  const [consentToPublish, setConsentToPublish] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasBody = hasReaderPostBody(body);
  const canSubmit = hasBody && !isPending;

  const reset = () => {
    setBody("");
    setContact("");
    setConsentToPublish(false);
    setError(null);
  };

  const close = () => {
    setStep("idle");
    reset();
  };

  const submit = () => {
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await submitReaderQuestion({
          billId,
          body,
          contact,
          consentToPublish,
        });
        if (result.ok) {
          setStep("sent");
          reset();
        } else {
          setError(result.error);
        }
      } catch {
        setError(READER_POST_FAILED_MESSAGE);
      }
    });
  };

  if (step === "idle") {
    return (
      <OpenFormButton onOpen={() => setStep("form")}>
        {openLabel}
      </OpenFormButton>
    );
  }

  if (step === "sent") {
    return (
      <SentMessage>
        ご質問ありがとうございます。運営者が内容を確認し、回答できるものには回答します。連絡先をいただいた場合は、そちらにお返事することがあります。
      </SentMessage>
    );
  }

  return (
    <>
      <form
        className="flex flex-col gap-4 rounded-[12px] border bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div>
          <label
            htmlFor="reader-question-body"
            className="mb-1.5 block text-xs font-bold text-mirai-text-subtle"
          >
            質問（必須・{READER_POST_BODY_MAX_LENGTH}文字まで）
          </label>
          <Textarea
            id="reader-question-body"
            required
            aria-required="true"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              billId
                ? "この議案について知りたいこと、わかりにくかったところなど"
                : "議会のしくみや、このサイトについて知りたいことなど"
            }
            rows={5}
            maxLength={READER_POST_BODY_MAX_LENGTH}
            disabled={isPending}
            className={TEXTAREA_CLASS}
          />
        </div>

        <div>
          <label
            htmlFor="reader-question-contact"
            className="mb-1.5 block text-xs font-bold text-mirai-text-subtle"
          >
            返信先メールアドレス（任意・公開されません）
          </label>
          <Input
            id="reader-question-contact"
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
          id="reader-question-consent"
          checked={consentToPublish}
          onChange={setConsentToPublish}
          disabled={isPending}
        >
          この質問と回答を、運営者の確認のうえで「よくある質問」としてこのサイトに公開してよい（質問文は運営者が言い換えることがあります）
        </ConsentCheckbox>

        <FormActions
          canSubmit={canSubmit}
          isPending={isPending}
          hasBody={hasBody}
          onCancel={close}
        />
      </form>
      {error && (
        <p
          role="alert"
          className="mt-2 text-[13px] leading-[1.6] text-destructive"
        >
          {error}
        </p>
      )}
    </>
  );
}
