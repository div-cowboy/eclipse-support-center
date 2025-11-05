"use client";

import { useState } from "react";
import { Button } from "@/components/shadcn/ui/button";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import { Textarea } from "@/components/shadcn/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/ui/select";
import { Checkbox } from "@/components/shadcn/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import { Separator } from "@/components/shadcn/ui/separator";
import { X, Plus } from "lucide-react";
import type { FormField } from "@/lib/form-service";

interface FormFieldEditorProps {
  field: FormField;
  onChange: (field: FormField) => void;
  onDelete?: () => void;
}

export function FormFieldEditor({
  field,
  onChange,
  onDelete,
}: FormFieldEditorProps) {
  const [options, setOptions] = useState(
    field.options || [{ label: "", value: "" }]
  );

  const updateField = (updates: Partial<FormField>) => {
    onChange({ ...field, ...updates });
  };

  const updateOption = (index: number, updates: { label?: string; value?: string }) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], ...updates };
    setOptions(newOptions);
    updateField({ options: newOptions.filter(opt => opt.label && opt.value) });
  };

  const addOption = () => {
    const newOptions = [...options, { label: "", value: "" }];
    setOptions(newOptions);
  };

  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
    updateField({ options: newOptions.filter(opt => opt.label && opt.value) });
  };

  const hasOptions = ["select", "radio", "checkbox"].includes(field.type);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Field Editor</CardTitle>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Field Type */}
        <div className="space-y-2">
          <Label>Field Type</Label>
          <Select
            value={field.type}
            onValueChange={(value: FormField["type"]) => {
              const newField: FormField = {
                ...field,
                type: value,
                options: hasOptions && !["select", "radio", "checkbox"].includes(value) 
                  ? undefined 
                  : field.options,
              };
              onChange(newField);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="textarea">Textarea</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="select">Select</SelectItem>
              <SelectItem value="radio">Radio</SelectItem>
              <SelectItem value="checkbox">Checkbox</SelectItem>
              <SelectItem value="file">File</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Label */}
        <div className="space-y-2">
          <Label>Label *</Label>
          <Input
            value={field.label}
            onChange={(e) => updateField({ label: e.target.value })}
            placeholder="Field Label"
            required
          />
        </div>

        {/* Field Name */}
        <div className="space-y-2">
          <Label>Field Name *</Label>
          <Input
            value={field.name}
            onChange={(e) => {
              // Auto-generate name from label if name is empty or matches old label
              const newName = e.target.value.toLowerCase().replace(/\s+/g, "_");
              updateField({ name: newName });
            }}
            placeholder="field_name"
            required
          />
          <p className="text-xs text-muted-foreground">
            Internal field name (lowercase, underscores)
          </p>
        </div>

        {/* Placeholder */}
        <div className="space-y-2">
          <Label>Placeholder</Label>
          <Input
            value={field.placeholder || ""}
            onChange={(e) => updateField({ placeholder: e.target.value || undefined })}
            placeholder="Enter placeholder text"
          />
        </div>

        {/* Help Text */}
        <div className="space-y-2">
          <Label>Help Text</Label>
          <Input
            value={field.helpText || ""}
            onChange={(e) => updateField({ helpText: e.target.value || undefined })}
            placeholder="Help text shown below the field"
          />
        </div>

        {/* Required */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`required-${field.id}`}
            checked={field.required}
            onCheckedChange={(checked) =>
              updateField({ required: !!checked })
            }
          />
          <Label htmlFor={`required-${field.id}`} className="cursor-pointer">
            Required field
          </Label>
        </div>

        {/* Default Value */}
        {field.type !== "file" && field.type !== "checkbox" && (
          <div className="space-y-2">
            <Label>Default Value</Label>
            <Input
              value={field.defaultValue?.toString() || ""}
              onChange={(e) => {
                let defaultValue: string | number | boolean | undefined = e.target.value;
                if (field.type === "number") {
                  defaultValue = e.target.value ? Number(e.target.value) : undefined;
                } else if (field.type === "checkbox") {
                  defaultValue = e.target.checked;
                }
                updateField({ defaultValue });
              }}
              type={field.type === "number" ? "number" : "text"}
              placeholder="Default value"
            />
          </div>
        )}

        {/* Options for select/radio/checkbox */}
        {hasOptions && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label>Options *</Label>
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Label"
                    value={option.label}
                    onChange={(e) =>
                      updateOption(index, { label: e.target.value })
                    }
                    className="flex-1"
                  />
                  <Input
                    placeholder="Value"
                    value={option.value}
                    onChange={(e) =>
                      updateOption(index, { value: e.target.value })
                    }
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOption(index)}
                    disabled={options.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            </div>
          </>
        )}

        {/* Validation */}
        <Separator />
        <div className="space-y-4">
          <Label>Validation Rules</Label>

          {/* Text/Textarea validation */}
          {(field.type === "text" || field.type === "textarea" || field.type === "email") && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Min Length</Label>
                <Input
                  type="number"
                  value={field.validation?.minLength || ""}
                  onChange={(e) =>
                    updateField({
                      validation: {
                        ...field.validation,
                        minLength: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      },
                    })
                  }
                  placeholder="Min"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Max Length</Label>
                <Input
                  type="number"
                  value={field.validation?.maxLength || ""}
                  onChange={(e) =>
                    updateField({
                      validation: {
                        ...field.validation,
                        maxLength: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      },
                    })
                  }
                  placeholder="Max"
                />
              </div>
              {field.type === "text" && (
                <div className="col-span-2 space-y-2">
                  <Label className="text-xs">Pattern (Regex)</Label>
                  <Input
                    value={field.validation?.pattern || ""}
                    onChange={(e) =>
                      updateField({
                        validation: {
                          ...field.validation,
                          pattern: e.target.value || undefined,
                        },
                      })
                    }
                    placeholder="^[a-zA-Z]+$"
                  />
                </div>
              )}
            </div>
          )}

          {/* Number validation */}
          {field.type === "number" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Min Value</Label>
                <Input
                  type="number"
                  value={field.validation?.min || ""}
                  onChange={(e) =>
                    updateField({
                      validation: {
                        ...field.validation,
                        min: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                  placeholder="Min"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Max Value</Label>
                <Input
                  type="number"
                  value={field.validation?.max || ""}
                  onChange={(e) =>
                    updateField({
                      validation: {
                        ...field.validation,
                        max: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                  placeholder="Max"
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

