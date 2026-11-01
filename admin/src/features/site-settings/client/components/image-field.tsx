"use client";

import { Upload, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { Input } from "@/components/ui/input";
import { uploadSiteAsset } from "../../server/actions/upload-site-asset";
import {
  SITE_ASSET_MAX_BYTES,
  type SiteAssetKind,
} from "../../shared/constants";

interface ImageFieldProps {
  value: string;
  onChange: (url: string) => void;
  assetKind: SiteAssetKind;
  disabled?: boolean;
}

/**
 * 画像の URL を持つ項目。アップロードするか URL を直接入力する。
 * 空文字は「同梱の既定画像を使う」を意味する。
 */
export function ImageField({
  value,
  onChange,
  assetKind,
  disabled,
}: ImageFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleFilesAccepted = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", assetKind);
      const result = await uploadSiteAsset(formData);
      if (result.error !== undefined) {
        toast.error(result.error);
        return;
      }
      onChange(result.url);
      setIsEditing(false);
      toast.success("画像をアップロードしました（保存ボタンで確定します）");
    } catch (error) {
      console.error("Upload site asset error:", error);
      toast.error("アップロードに失敗しました");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        {value ? (
          // 管理者がアップロードした任意ドメインの画像。next/image の最適化対象外
          // biome-ignore lint/performance/noImgElement: 任意ドメインのプレビュー
          <img
            src={value}
            alt=""
            className="h-16 max-w-[200px] rounded border bg-[repeating-conic-gradient(#f3f4f6_0_25%,#fff_0_50%)] bg-[length:16px_16px] object-contain p-1"
          />
        ) : (
          <p className="text-sm text-gray-500 py-2">
            未設定（同梱の既定画像を使います）
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditing((v) => !v)}
            disabled={disabled || isUploading}
          >
            <Upload className="mr-1 h-4 w-4" />
            {isEditing ? "閉じる" : value ? "画像を変更" : "画像を設定"}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange("")}
              disabled={disabled || isUploading}
            >
              <X className="mr-1 h-4 w-4" />
              既定に戻す
            </Button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="space-y-2 rounded-md border bg-gray-50 p-3">
          <Dropzone
            onFilesAccepted={handleFilesAccepted}
            maxSize={SITE_ASSET_MAX_BYTES}
            accept={{
              "image/*": [".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"],
            }}
            disabled={disabled || isUploading}
            className="[&>div:first-child]:p-4"
          />
          <Input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="または画像の URL を入力（https://...）"
            disabled={disabled || isUploading}
          />
          {isUploading && (
            <p className="text-xs text-gray-500">アップロード中...</p>
          )}
        </div>
      )}
    </div>
  );
}
