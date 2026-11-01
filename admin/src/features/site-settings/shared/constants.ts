export const SITE_ASSETS_BUCKET = "site-assets";

/** アップロードできる画像の上限（OGP 画像や写真を想定） */
export const SITE_ASSET_MAX_BYTES = 5 * 1024 * 1024;

export const SITE_ASSET_KINDS = [
  "logo",
  "service_logo",
  "ogp",
  "archive_hero",
  "icon_192",
  "icon_512",
  "icon_ios",
  "operator_photo",
] as const;

export type SiteAssetKind = (typeof SITE_ASSET_KINDS)[number];

export const SITE_ASSET_ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/gif": "gif",
};
