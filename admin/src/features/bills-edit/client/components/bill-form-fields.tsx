"use client";

import type { Control } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ARTICLE_KIND_LABELS,
  type BillArticleKind,
} from "@/features/bills/shared/types";
import type { Committee } from "@/features/committees/shared/types";
import type { DietSession } from "@/features/diet-sessions/shared/types";
import type { BillCreateInput } from "../../shared/types";
import { BillCouncilFields } from "./bill-council-fields";
import { ShareImageGenerator } from "./share-image-generator";
import { ThumbnailUpload } from "./thumbnail-upload";

const ARTICLE_KIND_OPTIONS = Object.entries(ARTICLE_KIND_LABELS).map(
  ([value, label]) => ({
    value: value as BillArticleKind,
    label,
  })
);

interface BillFormFieldsProps {
  control: Control<BillCreateInput>;
  billId?: string;
  dietSessions: DietSession[];
  committees: Committee[];
  shareImageDefaultTitle?: string;
}

export function BillFormFields({
  control,
  billId,
  dietSessions,
  committees,
  shareImageDefaultTitle,
}: BillFormFieldsProps) {
  return (
    <>
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>議案名 *</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormDescription>
              議案の正式名称を入力してください（最大200文字）
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <BillCouncilFields control={control} committees={committees} />

      <FormField
        control={control}
        name="status_note"
        render={({ field }) => (
          <FormItem>
            <FormLabel>審議状況の補足</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                value={field.value || ""}
                className="min-h-[100px]"
              />
            </FormControl>
            <FormDescription>
              審議状況の詳細や補足情報を入力してください（最大500文字）
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="submitted_date"
        render={({ field }) => (
          <FormItem>
            <FormLabel>提出日 *</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormDescription>
              議案の提出日（本会議に上程された日）
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="thumbnail_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel>サムネイル画像</FormLabel>
            <FormControl>
              <ThumbnailUpload
                value={field.value}
                onChange={field.onChange}
                billId={billId}
              />
            </FormControl>
            <FormDescription>
              議案のサムネイル画像を設定してください（任意）
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="share_thumbnail_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel>シェア用OGP画像</FormLabel>
            <FormControl>
              <ThumbnailUpload
                value={field.value}
                onChange={field.onChange}
                billId={billId}
                storagePrefix="share"
              />
            </FormControl>
            <FormDescription>
              Twitter等のSNSでシェアされた際に表示される画像を設定してください（任意）。設定しない場合はサムネイル画像が使用されます。
            </FormDescription>
            <FormMessage />
            {billId && shareImageDefaultTitle !== undefined && (
              <ShareImageGenerator
                billId={billId}
                defaultTitle={shareImageDefaultTitle}
                onGenerated={field.onChange}
              />
            )}
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="shugiin_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel>議会サイトURL</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value || ""}
                placeholder="https://www.sagamihara-shigikai.jp/..."
              />
            </FormControl>
            <FormDescription>
              議会サイトの議案ページURLを入力してください（「これから掲載される議案」表示時に外部リンクとして使用）
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="slug"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Slug</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value || ""}
                placeholder="221-kaku-1-mof-法案名"
              />
            </FormControl>
            <FormDescription>
              コンテンツ同期用の識別子です（最大200文字）
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="diet_session_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>会期</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value ?? undefined}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="会期を選択" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {dietSessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.name}（{session.start_date}〜{session.end_date}）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              議案が提出された会期を選択してください
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="is_featured"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>注目の議案</FormLabel>
              <FormDescription>
                公開中の議案のうち、トップページなどで優先的に表示されます（下書きの議案には付けても表示されません）
              </FormDescription>
            </div>
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="is_review_completed"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>記事レビュー完了</FormLabel>
              <FormDescription>
                運営者が本文・要確認を確かめたら付けます。完了していない議案は公開できません。公開中の議案で外すと、公開を取り下げて下書きに戻ります
              </FormDescription>
            </div>
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="article_kind"
        render={({ field }) => (
          <FormItem>
            <FormLabel>記事の種別</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="記事の種別を選択" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {ARTICLE_KIND_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              AI自動生成版は、人の確認を経ていない記事の印です。この版では AI
              自動生成版のまま公開することはできません。確認したら通常版に戻し、「記事レビュー完了」をオンにしてください
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="knowledge_source"
        render={({ field }) => (
          <FormItem>
            <FormLabel>ナレッジソース</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                value={field.value ?? ""}
                placeholder="議案の補足情報や運営者の見立てなどを入力"
                className="min-h-[200px] resize-y"
              />
            </FormControl>
            <FormDescription>
              AIインタビュー（常時参照）と、AIチャット（下のトグルで参照可否を切替）で使われる補足情報です。最大40,000文字。
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="use_knowledge_source_in_chat"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>AIチャットでもナレッジソースを使用する</FormLabel>
              <FormDescription>
                ONにすると、議案ページのAIチャットのシステムプロンプトに上のナレッジソースが追加されます。AIインタビューでは常に使用されます。
              </FormDescription>
            </div>
          </FormItem>
        )}
      />
    </>
  );
}
