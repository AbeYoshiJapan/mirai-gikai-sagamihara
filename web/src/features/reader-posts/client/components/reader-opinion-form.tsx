"use client";

import {
  getResidenceLabel,
  READER_AGE_GROUP_LABELS,
  READER_AGE_GROUPS,
  READER_OPINION_DISPLAY_NAME_MAX_LENGTH,
  READER_OPINION_STANCE_LABELS,
  READER_OPINION_STANCES,
  READER_POST_BODY_MAX_LENGTH,
  READER_RESIDENCES,
  type ReaderAgeGroup,
  type ReaderOpinionStance,
  type ReaderResidence,
} from "@mirai-gikai/shared/reader-posts/labels";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitReaderOpinion } from "../../server/actions/submit-reader-opinion";
import { READER_POST_FAILED_MESSAGE } from "../../shared/types";
import { hasReaderPostBody } from "../../shared/utils/reader-opinion-input";
import {
  ChoiceButtons,
  ConsentCheckbox,
  FormActions,
  INPUT_CLASS,
  OpenFormButton,
  SentMessage,
  TEXTAREA_CLASS,
} from "./reader-post-form-parts";

type Step = "idle" | "form" | "sent";

const STANCE_OPTIONS = READER_OPINION_STANCES.map((value) => ({
  value,
  label: READER_OPINION_STANCE_LABELS[value],
}));

const AGE_GROUP_OPTIONS = READER_AGE_GROUPS.map((value) => ({
  value,
  label: READER_AGE_GROUP_LABELS[value],
}));

export function ReaderOpinionForm({
  billId,
  municipality,
}: {
  billId: string;
  municipality: string;
}) {
  const [step, setStep] = useState<Step>("idle");
  const [stance, setStance] = useState<ReaderOpinionStance | null>(null);
  const [body, setBody] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [residence, setResidence] = useState<ReaderResidence | null>(null);
  const [ageGroup, setAgeGroup] = useState<ReaderAgeGroup | null>(null);
  const [consentToPublish, setConsentToPublish] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const residenceOptions = READER_RESIDENCES.map((value) => ({
    value,
    label: getResidenceLabel(value, municipality),
  }));

  const hasBody = hasReaderPostBody(body);
  const canSubmit = hasBody && stance !== null && !isPending;

  const reset = () => {
    setStance(null);
    setBody("");
    setDisplayName("");
    setResidence(null);
    setAgeGroup(null);
    setConsentToPublish(false);
    setError(null);
  };

  const close = () => {
    setStep("idle");
    reset();
  };

  const submit = () => {
    if (!canSubmit || stance === null) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await submitReaderOpinion({
          billId,
          stance,
          body,
          displayName,
          residence: residence ?? undefined,
          ageGroup: ageGroup ?? undefined,
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
        この議案への意見を送る
      </OpenFormButton>
    );
  }

  if (step === "sent") {
    return (
      <SentMessage>
        ご意見ありがとうございます。いただいた内容は運営者が確認したうえで、公開に同意いただいたものだけを掲載します。掲載までには時間がかかることがあります。
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
        <ChoiceButtons
          legend="この議案への賛否（必須）"
          options={STANCE_OPTIONS}
          value={stance}
          onChange={setStance}
          disabled={isPending}
          allowDeselect={false}
        />

        <div>
          <label
            htmlFor="reader-opinion-body"
            className="mb-1.5 block text-xs font-bold text-mirai-text-subtle"
          >
            意見（必須・{READER_POST_BODY_MAX_LENGTH}文字まで）
          </label>
          <Textarea
            id="reader-opinion-body"
            required
            aria-required="true"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="この議案について思うこと、暮らしへの影響、議会に考えてほしいことなど"
            rows={5}
            maxLength={READER_POST_BODY_MAX_LENGTH}
            disabled={isPending}
            className={TEXTAREA_CLASS}
          />
        </div>

        <div>
          <label
            htmlFor="reader-opinion-display-name"
            className="mb-1.5 block text-xs font-bold text-mirai-text-subtle"
          >
            表示名（任意・公開時に表示。空欄なら「匿名」）
          </label>
          <Input
            id="reader-opinion-display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="ニックネームなど"
            maxLength={READER_OPINION_DISPLAY_NAME_MAX_LENGTH}
            disabled={isPending}
            className={INPUT_CLASS}
          />
        </div>

        <ChoiceButtons
          legend="お住まい（任意）"
          options={residenceOptions}
          value={residence}
          onChange={setResidence}
          disabled={isPending}
        />

        <ChoiceButtons
          legend="年代（任意）"
          options={AGE_GROUP_OPTIONS}
          value={ageGroup}
          onChange={setAgeGroup}
          disabled={isPending}
        />

        <ConsentCheckbox
          id="reader-opinion-consent"
          checked={consentToPublish}
          onChange={setConsentToPublish}
          disabled={isPending}
        >
          この意見を、運営者の確認のうえでこのサイトに公開してよい（表示名・お住まい・年代も一緒に表示されます）
        </ConsentCheckbox>

        <FormActions
          canSubmit={canSubmit}
          isPending={isPending}
          hasBody={hasBody && stance !== null}
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
