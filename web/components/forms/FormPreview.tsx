"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
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
import { Button } from "@/components/shadcn/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/shadcn/ui/radio-group";
import type { FormField, FormSettings } from "@/lib/form-service";

interface FormPreviewProps {
  fields: FormField[];
  settings: FormSettings;
}

export function FormPreview({ fields, settings }: FormPreviewProps) {
  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

  const themeStyle = {
    "--primary-color": settings.theme?.primaryColor || "#000000",
    "--border-radius": settings.theme?.borderRadius || "4px",
    "--font-family": settings.theme?.fontFamily || "inherit",
  } as React.CSSProperties;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Form Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="space-y-4 p-4 border rounded-lg"
          style={themeStyle}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert("This is a preview. Form submission is disabled.");
            }}
            className="space-y-4"
          >
            {sortedFields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id}>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>

                {field.type === "text" && (
                  <Input
                    id={field.id}
                    type="text"
                    placeholder={field.placeholder}
                    defaultValue={field.defaultValue?.toString()}
                    required={field.required}
                    style={{
                      borderColor: "var(--primary-color)",
                      borderRadius: "var(--border-radius)",
                      fontFamily: "var(--font-family)",
                    }}
                  />
                )}

                {field.type === "email" && (
                  <Input
                    id={field.id}
                    type="email"
                    placeholder={field.placeholder}
                    defaultValue={field.defaultValue?.toString()}
                    required={field.required}
                    style={{
                      borderColor: "var(--primary-color)",
                      borderRadius: "var(--border-radius)",
                      fontFamily: "var(--font-family)",
                    }}
                  />
                )}

                {field.type === "textarea" && (
                  <Textarea
                    id={field.id}
                    placeholder={field.placeholder}
                    defaultValue={field.defaultValue?.toString()}
                    required={field.required}
                    rows={4}
                    style={{
                      borderColor: "var(--primary-color)",
                      borderRadius: "var(--border-radius)",
                      fontFamily: "var(--font-family)",
                    }}
                  />
                )}

                {field.type === "number" && (
                  <Input
                    id={field.id}
                    type="number"
                    placeholder={field.placeholder}
                    defaultValue={field.defaultValue?.toString()}
                    required={field.required}
                    min={field.validation?.min}
                    max={field.validation?.max}
                    style={{
                      borderColor: "var(--primary-color)",
                      borderRadius: "var(--border-radius)",
                      fontFamily: "var(--font-family)",
                    }}
                  />
                )}

                {field.type === "date" && (
                  <Input
                    id={field.id}
                    type="date"
                    defaultValue={field.defaultValue?.toString()}
                    required={field.required}
                    style={{
                      borderColor: "var(--primary-color)",
                      borderRadius: "var(--border-radius)",
                      fontFamily: "var(--font-family)",
                    }}
                  />
                )}

                {field.type === "select" && field.options && (
                  <Select defaultValue={field.defaultValue?.toString()}>
                    <SelectTrigger
                      style={{
                        borderColor: "var(--primary-color)",
                        borderRadius: "var(--border-radius)",
                        fontFamily: "var(--font-family)",
                      }}
                    >
                      <SelectValue placeholder={field.placeholder || "Select an option"} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map((option, index) => (
                        <SelectItem key={index} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {field.type === "radio" && field.options && (
                  <RadioGroup
                    defaultValue={field.defaultValue?.toString()}
                    required={field.required}
                  >
                    {field.options.map((option, index) => (
                      <RadioGroupItem
                        key={index}
                        value={option.value}
                        id={`${field.id}-${index}`}
                      >
                        {option.label}
                      </RadioGroupItem>
                    ))}
                  </RadioGroup>
                )}

                {field.type === "checkbox" && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={field.id}
                      defaultChecked={field.defaultValue as boolean}
                      required={field.required}
                    />
                    <Label htmlFor={field.id} className="cursor-pointer font-normal">
                      {field.placeholder || "Check this box"}
                    </Label>
                  </div>
                )}

                {field.type === "file" && (
                  <Input
                    id={field.id}
                    type="file"
                    required={field.required}
                  />
                )}

                {field.helpText && (
                  <p className="text-xs text-muted-foreground">
                    {field.helpText}
                  </p>
                )}
              </div>
            ))}

            <Button
              type="submit"
              className="w-full"
              style={{
                backgroundColor: settings.submitButton?.color || "var(--primary-color)",
                borderRadius: "var(--border-radius)",
                fontFamily: "var(--font-family)",
              }}
            >
              {settings.submitButton?.text || "Submit"}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

