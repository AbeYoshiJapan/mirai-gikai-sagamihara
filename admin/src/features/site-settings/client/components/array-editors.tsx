"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  type Control,
  type FieldValues,
  useFieldArray,
  useFormContext,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField, FormItem, FormMessage } from "@/components/ui/form";
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
  COMMITTEE_KIND_OPTIONS,
  type CustomEditor,
  type FieldOption,
  SNS_ICON_OPTIONS,
} from "../../shared/field-definitions";

interface EditorProps {
  control: Control<FieldValues>;
  /** 配列のパス（例: "committees" / "operator.sns"） */
  name: string;
  disabled?: boolean;
}

type ColumnKind = "text" | "url" | "number" | "boolean" | "select";

type Column = {
  key: string;
  label: string;
  kind: ColumnKind;
  options?: FieldOption[];
  placeholder?: string;
  width?: string;
};

const EDITORS: Record<
  CustomEditor,
  { title: string; columns: Column[]; empty: () => Record<string, unknown> }
> = {
  committees: {
    title: "委員会",
    columns: [
      { key: "name", label: "名称", kind: "text", placeholder: "総務委員会" },
      { key: "short_name", label: "略称", kind: "text", placeholder: "総務" },
      {
        key: "kind",
        label: "種別",
        kind: "select",
        options: COMMITTEE_KIND_OPTIONS,
        width: "w-44",
      },
      { key: "sort", label: "順", kind: "number", width: "w-20" },
      { key: "is_active", label: "有効", kind: "boolean", width: "w-16" },
    ],
    empty: () => ({
      name: "",
      short_name: "",
      kind: "standing",
      sort: 0,
      is_active: true,
    }),
  },
  sns: {
    title: "SNS",
    columns: [
      { key: "name", label: "表示名", kind: "text", placeholder: "X" },
      {
        key: "url",
        label: "URL",
        kind: "url",
        placeholder: "https://x.com/...",
      },
      {
        key: "icon",
        label: "アイコン",
        kind: "select",
        options: SNS_ICON_OPTIONS,
        width: "w-44",
      },
    ],
    empty: () => ({ name: "", url: "", icon: "web" }),
  },
  import_sources: {
    title: "取込元",
    columns: [
      { key: "id", label: "ID", kind: "text", placeholder: "agenda" },
      {
        key: "adapter",
        label: "アダプタ",
        kind: "text",
        placeholder: "sagamihara_agenda_pdf",
      },
      { key: "url", label: "URL", kind: "url" },
      {
        key: "schedule",
        label: "cron（空なら手動）",
        kind: "text",
        placeholder: "0 6 * * *",
      },
      { key: "enabled", label: "有効", kind: "boolean", width: "w-16" },
    ],
    empty: () => ({
      id: "",
      adapter: "",
      url: "",
      enabled: true,
      schedule: "",
    }),
  },
};

function CellInput({
  control,
  name,
  column,
  disabled,
}: {
  control: Control<FieldValues>;
  name: string;
  column: Column;
  disabled?: boolean;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-1">
          {column.kind === "boolean" ? (
            <Checkbox
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
              disabled={disabled}
              aria-label={column.label}
            />
          ) : column.kind === "select" ? (
            <Select
              value={String(field.value ?? "")}
              onValueChange={field.onChange}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 w-full" aria-label={column.label}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {column.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : column.kind === "number" ? (
            <Input
              type="number"
              className="h-8"
              value={
                field.value === undefined || field.value === null
                  ? ""
                  : String(field.value)
              }
              onChange={(e) =>
                field.onChange(
                  e.target.value === "" ? undefined : Number(e.target.value)
                )
              }
              onBlur={field.onBlur}
              disabled={disabled}
              aria-label={column.label}
            />
          ) : (
            <Input
              {...field}
              value={field.value ?? ""}
              type={column.kind === "url" ? "url" : "text"}
              className="h-8"
              placeholder={column.placeholder}
              disabled={disabled}
              aria-label={column.label}
            />
          )}
          <FormMessage className="text-xs" />
        </FormItem>
      )}
    />
  );
}

/**
 * 委員会・SNS・取込元のような「行の配列」を表で編集する。
 */
export function ArrayEditor({
  editor,
  control,
  name,
  disabled,
}: EditorProps & { editor: CustomEditor }) {
  const config = EDITORS[editor];
  const { fields, append, remove } = useFieldArray({ control, name });
  const { getFieldState } = useFormContext();
  const arrayError = getFieldState(name).error;

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            {config.columns.map((column) => (
              <TableHead key={column.key} className={column.width}>
                {column.label}
              </TableHead>
            ))}
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={config.columns.length + 1}
                className="text-center text-sm text-gray-500"
              >
                まだありません
              </TableCell>
            </TableRow>
          )}
          {fields.map((row, index) => (
            <TableRow key={row.id}>
              {config.columns.map((column) => (
                <TableCell key={column.key} className="align-top">
                  <CellInput
                    control={control}
                    name={`${name}.${index}.${column.key}`}
                    column={column}
                    disabled={disabled}
                  />
                </TableCell>
              ))}
              <TableCell className="align-top">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  disabled={disabled}
                  aria-label={`${config.title}を削除`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {arrayError?.message && (
        <p className="text-sm text-destructive">{arrayError.message}</p>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append(config.empty())}
        disabled={disabled}
      >
        <Plus className="mr-1 h-4 w-4" />
        {config.title}を追加
      </Button>
    </div>
  );
}
