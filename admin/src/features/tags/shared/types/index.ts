export type Tag = {
  id: string;
  label: string;
  description: string | null;
  featured_priority: number | null;
  /** テーマのページを公開する */
  is_theme: boolean;
  /** テーマ一覧での並び順（小さいほど先） */
  theme_order: number;
  created_at: string;
  updated_at: string;
};

export type TagWithBillCount = Tag & {
  bill_count: number;
};

export type CreateTagInput = {
  label: string;
};

export type UpdateTagInput = {
  id: string;
  label: string;
  description?: string | null;
  featured_priority?: number | null;
  is_theme?: boolean;
  theme_order?: number;
};

export type DeleteTagInput = {
  id: string;
};
