"use client";

import type { Control, FieldValues } from "react-hook-form";
import type {
  FieldGroup,
  SectionDefinition,
} from "../../shared/field-definitions";
import { ArrayEditor } from "./array-editors";
import { BrandPresetPicker } from "./brand-preset-picker";
import { FieldRenderer } from "./field-renderer";

interface SectionFieldsProps {
  control: Control<FieldValues>;
  definition: SectionDefinition;
  /** フォーム内のパスの前置き。全体フォームなら "section."、単体なら "" */
  namePrefix?: string;
  /** 一部のグループだけ出す（ウィザード用） */
  groupTitles?: string[];
  disabled?: boolean;
}

function GroupBlock({
  control,
  group,
  namePrefix,
  disabled,
}: {
  control: Control<FieldValues>;
  group: FieldGroup;
  namePrefix: string;
  disabled?: boolean;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900">{group.title}</h3>
        {group.description && (
          <p className="mt-1 text-sm text-gray-500">{group.description}</p>
        )}
      </div>
      {group.fields.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {group.fields.map((field) => (
            <FieldRenderer
              key={field.name}
              control={control}
              field={field}
              name={`${namePrefix}${field.name}`}
              disabled={disabled}
            />
          ))}
        </div>
      )}
      {group.custom && group.custom.editor === "brand_preset" && (
        <BrandPresetPicker
          control={control}
          name={`${namePrefix}${group.custom.name}`}
          disabled={disabled}
        />
      )}
      {group.custom && group.custom.editor !== "brand_preset" && (
        <ArrayEditor
          editor={group.custom.editor}
          control={control}
          name={`${namePrefix}${group.custom.name}`}
          disabled={disabled}
        />
      )}
    </section>
  );
}

/**
 * セクション定義に従って項目を並べる。
 */
export function SectionFields({
  control,
  definition,
  namePrefix = "",
  groupTitles,
  disabled,
}: SectionFieldsProps) {
  const groups = groupTitles
    ? definition.groups.filter((g) => groupTitles.includes(g.title))
    : definition.groups;

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <GroupBlock
          key={group.title}
          control={control}
          group={group}
          namePrefix={namePrefix}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
