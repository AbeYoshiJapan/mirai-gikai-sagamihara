"use client";

import {
  BILL_KIND_LABELS,
  BILL_KINDS,
  BILL_RESULT_LABELS,
  BILL_RESULTS,
  BILL_STAGE_LABELS,
  BILL_STAGES,
  isDeliberationKind,
  PROPOSER_KIND_LABELS,
  PROPOSER_KINDS,
  VOTE_OUTCOME_LABELS,
  VOTE_OUTCOMES,
} from "@mirai-gikai/shared/bill-stage/labels";
import { AlertTriangle } from "lucide-react";
import { type Control, useWatch } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Committee } from "@/features/committees/shared/types";
import type { BillCreateInput } from "../../shared/types";
import { shouldAutoCloseInterviewOnBillStage } from "../../shared/utils/should-auto-close-interview";

interface BillCouncilFieldsProps {
  control: Control<BillCreateInput>;
  committees: Committee[];
}

/** Select は空文字を選べないので「なし」を表す値 */
const NONE = "__none__";

/**
 * 地方議会向けの項目：議案番号・種類・提出者・付託先・審議段階・結果。
 */
export function BillCouncilFields({
  control,
  committees,
}: BillCouncilFieldsProps) {
  const billKind = useWatch({ control, name: "bill_kind" }) ?? "other";
  const stage = useWatch({ control, name: "stage" }) ?? null;
  const result = useWatch({ control, name: "result" }) ?? null;
  const deliberates = isDeliberationKind(billKind);

  return (
    <div className="space-y-4 rounded-md border p-4">
      <h3 className="text-sm font-semibold text-gray-700">
        議案の区分と審議状況
      </h3>

      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          control={control}
          name="bill_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>議案番号</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="議案第99号"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="bill_kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel>種類 *</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value ?? "other"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="種類を選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {BILL_KINDS.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {BILL_KIND_LABELS[kind]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                委員会報告・行政計画・特別委員会は審議・採決の対象外として扱います
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="proposer_kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel>提出者 *</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value ?? "mayor"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="提出者を選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PROPOSER_KINDS.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {PROPOSER_KIND_LABELS[kind]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {deliberates && (
        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={control}
            name="stage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>審議段階 *</FormLabel>
                <Select
                  onValueChange={(value) =>
                    field.onChange(value === NONE ? null : value)
                  }
                  value={field.value ?? "preparing"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="審議段階を選択" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {BILL_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {BILL_STAGE_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {shouldAutoCloseInterviewOnBillStage({
                  stage: field.value ?? undefined,
                  result: result ?? undefined,
                }) && (
                  <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded flex items-start gap-2">
                    <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                    <span>
                      保存すると、この議案に紐づく公開中のインタビューは自動でクローズされます。
                    </span>
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="committee_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>付託先の委員会</FormLabel>
                <Select
                  onValueChange={(value) =>
                    field.onChange(value === NONE ? null : value)
                  }
                  value={field.value ?? NONE}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="付託先を選択" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>（付託なし・未定）</SelectItem>
                    {committees.map((committee) => (
                      <SelectItem key={committee.id} value={committee.id}>
                        {committee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {committees.length === 0 && (
                  <FormDescription>
                    「委員会」メニューで委員会を登録すると選べます
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {stage === "decided" && (
            <FormField
              control={control}
              name="decided_on"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>議決日</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      )}

      {deliberates && stage === "decided" && (
        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={control}
            name="result"
            render={({ field }) => (
              <FormItem>
                <FormLabel>結果 *</FormLabel>
                <Select
                  onValueChange={(value) =>
                    field.onChange(value === NONE ? null : value)
                  }
                  value={field.value ?? NONE}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="結果を選択" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>（未入力）</SelectItem>
                    {BILL_RESULTS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {BILL_RESULT_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="vote_outcome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>採決</FormLabel>
                <Select
                  onValueChange={(value) =>
                    field.onChange(value === NONE ? null : value)
                  }
                  value={field.value ?? NONE}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="採決の結果" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>（未入力）</SelectItem>
                    {VOTE_OUTCOMES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {VOTE_OUTCOME_LABELS[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      <FormField
        control={control}
        name="bill_document_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel>議案書 PDF の URL</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ""}
                placeholder="https://www.sagamihara-shigikai.jp/....pdf"
              />
            </FormControl>
            <FormDescription>
              公開ページの「一次資料」に議案書として出します。会議録や審議結果は「一次資料」欄で追加できます
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
