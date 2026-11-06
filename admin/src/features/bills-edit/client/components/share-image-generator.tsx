"use client";

import {
  CircleAlert,
  CircleCheck,
  ImageIcon,
  Loader2,
  WrapText,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { findLatestSharePhoto } from "../../server/actions/find-latest-share-photo";
import { generateShareImage } from "../../server/actions/generate-share-image";
import {
  autoBreakShareImageTitle,
  buildShareImagePreviewPath,
  SHARE_IMAGE_HEIGHT,
  SHARE_IMAGE_TITLE_FONT_SIZE,
  SHARE_IMAGE_TITLE_MAX_LENGTH,
  SHARE_IMAGE_TITLE_MAX_LINES,
  SHARE_IMAGE_WIDTH,
  validateShareImageTitle,
} from "../../shared/utils/share-image";
import { uploadThumbnail } from "../lib/thumbnail-storage";

const PREVIEW_DEBOUNCE_MS = 600;

type Notice = { kind: "error" | "success"; text: string };

interface ShareImageGeneratorProps {
  billId: string;
  defaultTitle: string;
  onGenerated: (url: string) => void;
}

export function ShareImageGenerator({
  billId,
  defaultTitle,
  onGenerated,
}: ShareImageGeneratorProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isReusedPhoto, setIsReusedPhoto] = useState(false);
  // 議案名を、画像に収まる位置で自動で改行して入れておく（手直しできる）
  const [title, setTitle] = useState(() =>
    autoBreakShareImageTitle(defaultTitle)
  );
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);

  const validation = validateShareImageTitle(title);

  // 作り直すとき、前にアップロードした背景写真をそのまま使えるようにする
  useEffect(() => {
    let cancelled = false;
    findLatestSharePhoto(billId)
      .then(({ url }) => {
        if (cancelled || !url) return;
        setPhotoUrl((current) => current ?? url);
        setIsReusedPhoto(true);
      })
      .catch(() => {
        // 見つからなくても、写真を選べば作れる
      });
    return () => {
      cancelled = true;
    };
  }, [billId]);

  useEffect(() => {
    if (!validateShareImageTitle(title).ok) {
      setPreviewPath(null);
      return;
    }
    const timer = setTimeout(() => {
      setPreviewFailed(false);
      setPreviewPath(buildShareImagePreviewPath({ title, photoUrl }));
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [title, photoUrl]);

  const handlePhotoAccepted = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setIsUploading(true);
    setNotice(null);
    try {
      const result = await uploadThumbnail(file, billId, "share-src");
      if (result.error || !result.url) {
        setNotice({
          kind: "error",
          text: result.error ?? "アップロードに失敗しました",
        });
        return;
      }
      setPhotoUrl(result.url);
      setIsReusedPhoto(false);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!photoUrl) return;
    setIsGenerating(true);
    setNotice(null);
    try {
      const result = await generateShareImage({ billId, title, photoUrl });
      if ("error" in result) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      onGenerated(result.url);
      setNotice({
        kind: "success",
        text: "シェア画像に設定しました。保存ボタンを押すと議案に反映されます。",
      });
    } catch {
      setNotice({ kind: "error", text: "シェア画像の生成に失敗しました" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4 rounded-md border p-4">
      <p className="text-sm font-medium">テンプレートからシェア画像を生成</p>

      <div className="space-y-2">
        <Label>背景写真（JPEG / PNG）</Label>
        <Dropzone
          onFilesAccepted={handlePhotoAccepted}
          maxFiles={1}
          maxSize={5 * 1024 * 1024}
          accept={{ "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"] }}
          disabled={isUploading}
        />
        {isUploading && (
          <p className="text-sm text-blue-600">アップロード中...</p>
        )}
        {isReusedPhoto && photoUrl && !isUploading && (
          <p className="text-sm text-muted-foreground">
            前にアップロードした背景写真を使います。変えるときは新しい写真を選んでください。
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="share-image-title">タイトル</Label>
        <Textarea
          id="share-image-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="min-h-[100px]"
        />
        <p className="text-sm text-muted-foreground">
          議案名を、画像に収まる位置で自動で改行して入れています。改行の位置や言い回しは自由に直せます（入れた改行はそのまま使い、長すぎる行は自動で折り返します）。
          {SHARE_IMAGE_TITLE_MAX_LINES}行・改行を除いて
          {SHARE_IMAGE_TITLE_MAX_LENGTH}
          文字まで。右上のタブにはサイト設定のサイト名が入り、サイト名を変えるとこの画像も自動で作り直します。
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setTitle(autoBreakShareImageTitle(title))}
        >
          <WrapText className="h-4 w-4 mr-2" />
          自動の改行に戻す
        </Button>
        {validation.ok ? (
          <p className="text-sm text-muted-foreground">
            画像では {validation.lines.length} 行になります
            {validation.fontSize < SHARE_IMAGE_TITLE_FONT_SIZE &&
              "（長いので文字を少し小さくしています）"}
            ：{validation.lines.map((line) => `「${line}」`).join("")}
          </p>
        ) : (
          <p className="text-sm text-destructive">{validation.error}</p>
        )}
      </div>

      {previewPath && (
        <div className="space-y-2">
          <Label>プレビュー{photoUrl ? "" : "（背景写真なし）"}</Label>
          <Image
            src={previewPath}
            alt="シェア画像のプレビュー"
            width={SHARE_IMAGE_WIDTH}
            height={SHARE_IMAGE_HEIGHT}
            unoptimized
            onError={() => setPreviewFailed(true)}
            className="w-full max-w-xl rounded-lg border"
          />
          {previewFailed && (
            <p className="text-sm text-destructive">
              プレビューの生成に失敗しました
            </p>
          )}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={handleGenerate}
        disabled={!photoUrl || !validation.ok || isGenerating || isUploading}
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <ImageIcon className="h-4 w-4 mr-2" />
        )}
        この画像をシェア画像に設定
      </Button>

      <div role="status" aria-live="polite">
        {notice && (
          <p
            className={cn(
              "flex items-start gap-2 rounded-md p-3 text-sm",
              notice.kind === "error"
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-foreground"
            )}
          >
            {notice.kind === "error" ? (
              <CircleAlert className="h-4 w-4 mt-0.5 shrink-0" />
            ) : (
              <CircleCheck className="h-4 w-4 mt-0.5 shrink-0" />
            )}
            {notice.text}
          </p>
        )}
      </div>
    </div>
  );
}
