"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  createCommittee,
  deleteCommittee,
  updateCommittee,
} from "../../server/actions/save-committee";
import {
  COMMITTEE_KIND_LABELS,
  type Committee,
  type CommitteeInput,
  type CommitteeKind,
} from "../../shared/types";

interface CommitteeManagerProps {
  committees: Committee[];
}

const KIND_OPTIONS = Object.entries(COMMITTEE_KIND_LABELS) as [
  CommitteeKind,
  string,
][];

function toInput(c: Committee): CommitteeInput {
  return {
    name: c.name,
    short_name: c.short_name,
    kind: c.kind,
    sort_order: c.sort_order,
    is_active: c.is_active,
  };
}

const EMPTY: CommitteeInput = {
  name: "",
  short_name: "",
  kind: "standing",
  sort_order: 0,
  is_active: true,
};

function CommitteeRowEditor({
  value,
  onChange,
  disabled,
}: {
  value: CommitteeInput;
  onChange: (next: CommitteeInput) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <TableCell>
        <Input
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="総務委員会"
          disabled={disabled}
          aria-label="委員会名"
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Input
          value={value.short_name}
          onChange={(e) => onChange({ ...value, short_name: e.target.value })}
          placeholder="総務"
          disabled={disabled}
          aria-label="略称"
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Select
          value={value.kind}
          onValueChange={(kind) =>
            onChange({ ...value, kind: kind as CommitteeKind })
          }
          disabled={disabled}
        >
          <SelectTrigger className="h-8 w-44" aria-label="種別">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KIND_OPTIONS.map(([kind, label]) => (
              <SelectItem key={kind} value={kind}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={String(value.sort_order)}
          onChange={(e) =>
            onChange({ ...value, sort_order: Number(e.target.value) || 0 })
          }
          disabled={disabled}
          aria-label="表示順"
          className="h-8 w-20"
        />
      </TableCell>
      <TableCell>
        <Checkbox
          checked={value.is_active}
          onCheckedChange={(checked) =>
            onChange({ ...value, is_active: checked === true })
          }
          disabled={disabled}
          aria-label="有効"
        />
      </TableCell>
    </>
  );
}

function ExistingRow({ committee }: { committee: Committee }) {
  const router = useRouter();
  const [value, setValue] = useState<CommitteeInput>(toInput(committee));
  const [isSaving, setIsSaving] = useState(false);
  const isDirty = JSON.stringify(value) !== JSON.stringify(toInput(committee));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateCommittee(committee.id, value);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("委員会を更新しました");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const result = await deleteCommittee(committee.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("委員会を削除しました");
    router.refresh();
  };

  return (
    <TableRow>
      <CommitteeRowEditor
        value={value}
        onChange={setValue}
        disabled={isSaving}
      />
      <TableCell>
        <div className="flex items-center gap-1">
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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`${committee.name}を削除`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>委員会を削除しますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  「{committee.name}
                  」を付託先にしている議案は付託先なしになります。
                  過去の委員会は削除せず「有効」を外すことをおすすめします。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  削除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

function NewRow({ nextSortOrder }: { nextSortOrder: number }) {
  const router = useRouter();
  const [value, setValue] = useState<CommitteeInput>({
    ...EMPTY,
    sort_order: nextSortOrder,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async () => {
    setIsSaving(true);
    try {
      const result = await createCommittee(value);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("委員会を追加しました");
      setValue({ ...EMPTY, sort_order: nextSortOrder + 1 });
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TableRow className="bg-gray-50">
      <CommitteeRowEditor
        value={value}
        onChange={setValue}
        disabled={isSaving}
      />
      <TableCell>
        <Button
          type="button"
          size="sm"
          onClick={handleCreate}
          disabled={isSaving || value.name.trim().length === 0}
        >
          <Plus className="mr-1 h-4 w-4" />
          追加
        </Button>
      </TableCell>
    </TableRow>
  );
}

/**
 * 委員会の一覧・追加・編集・削除。
 */
export function CommitteeManager({ committees }: CommitteeManagerProps) {
  const nextSortOrder =
    committees.reduce((max, c) => Math.max(max, c.sort_order), 0) + 1;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>委員会名</TableHead>
          <TableHead className="w-40">略称</TableHead>
          <TableHead className="w-48">種別</TableHead>
          <TableHead className="w-24">表示順</TableHead>
          <TableHead className="w-16">有効</TableHead>
          <TableHead className="w-40" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {committees.map((committee) => (
          <ExistingRow key={committee.id} committee={committee} />
        ))}
        <NewRow nextSortOrder={nextSortOrder} />
      </TableBody>
    </Table>
  );
}
