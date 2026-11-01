"use client";

import {
  BILL_SOURCE_KIND_LABELS,
  BILL_SOURCE_KINDS,
  type BillSourceKind,
} from "@mirai-gikai/shared/bill-sources/labels";
import { ExternalLink, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createBillSource,
  deleteBillSource,
  updateBillSource,
} from "../../server/actions/save-bill-source";
import type { BillSource, BillSourceInput } from "../../shared/types";

interface BillSourcesFormProps {
  billId: string;
  sources: BillSource[];
}

function toInput(s: BillSource): BillSourceInput {
  return {
    kind: s.kind,
    url: s.url,
    label: s.label,
    meeting_date: s.meeting_date ?? "",
    sort_order: s.sort_order,
  };
}

const EMPTY: BillSourceInput = {
  kind: "bill_pdf",
  url: "",
  label: "",
  meeting_date: "",
  sort_order: 0,
};

function SourceRowEditor({
  value,
  onChange,
  disabled,
}: {
  value: BillSourceInput;
  onChange: (next: BillSourceInput) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <TableCell>
        <Select
          value={value.kind}
          onValueChange={(kind) =>
            onChange({ ...value, kind: kind as BillSourceKind })
          }
          disabled={disabled}
        >
          <SelectTrigger className="h-8 w-44" aria-label="種類">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BILL_SOURCE_KINDS.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {BILL_SOURCE_KIND_LABELS[kind]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          value={value.url}
          onChange={(e) => onChange({ ...value, url: e.target.value })}
          placeholder="https://..."
          disabled={disabled}
          aria-label="URL"
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Input
          value={value.label}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
          placeholder="例: 総務委員会（9月5日）"
          disabled={disabled}
          aria-label="表示名"
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Input
          type="date"
          value={value.meeting_date}
          onChange={(e) => onChange({ ...value, meeting_date: e.target.value })}
          disabled={disabled}
          aria-label="会議日"
          className="h-8 w-40"
        />
      </TableCell>
    </>
  );
}

function ExistingRow({ source }: { source: BillSource }) {
  const router = useRouter();
  const [value, setValue] = useState<BillSourceInput>(toInput(source));
  const [isSaving, setIsSaving] = useState(false);
  const isDirty = JSON.stringify(value) !== JSON.stringify(toInput(source));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateBillSource(source.id, value);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("一次資料を更新しました");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const result = await deleteBillSource(source.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("一次資料を削除しました");
    router.refresh();
  };

  return (
    <TableRow>
      <SourceRowEditor value={value} onChange={setValue} disabled={isSaving} />
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            asChild
            aria-label="開く"
          >
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          <Button
            type="button"
            size="sm"
            variant={isDirty ? "default" : "outline"}
            onClick={handleSave}
            disabled={!isDirty || isSaving}
          >
            <Save className="mr-1 h-4 w-4" />
            保存
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleDelete}
            aria-label="削除"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function NewRow({ billId }: { billId: string }) {
  const router = useRouter();
  const [value, setValue] = useState<BillSourceInput>(EMPTY);
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async () => {
    setIsSaving(true);
    try {
      const result = await createBillSource(billId, value);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("一次資料を追加しました");
      setValue(EMPTY);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TableRow className="bg-gray-50">
      <SourceRowEditor value={value} onChange={setValue} disabled={isSaving} />
      <TableCell>
        <Button
          type="button"
          size="sm"
          onClick={handleCreate}
          disabled={isSaving || value.url.trim().length === 0}
        >
          <Plus className="mr-1 h-4 w-4" />
          追加
        </Button>
      </TableCell>
    </TableRow>
  );
}

/**
 * 議案の一次資料（議案書・会議録・審議結果・中継など）の編集。
 * 公開ページの「一次資料」欄に出る。
 */
export function BillSourcesForm({ billId, sources }: BillSourcesFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>一次資料</CardTitle>
        <p className="text-sm text-gray-500">
          議会サイトの議案書・会議録・審議結果・中継へのリンク。公開ページの「一次資料」に出ます。
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-48">種類</TableHead>
              <TableHead>URL</TableHead>
              <TableHead className="w-56">表示名</TableHead>
              <TableHead className="w-44">会議日</TableHead>
              <TableHead className="w-44" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.map((source) => (
              <ExistingRow key={source.id} source={source} />
            ))}
            <NewRow billId={billId} />
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
