"use client";

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
import type { FormSettings } from "@/lib/form-service";
import { TicketPriority } from "@prisma/client";

interface FormSettingsPanelProps {
  settings: FormSettings;
  defaultCategory?: string;
  defaultPriority?: TicketPriority | null;
  tags?: string[];
  onChange: (settings: {
    settings: FormSettings;
    defaultCategory?: string;
    defaultPriority?: TicketPriority | null;
    tags?: string[];
  }) => void;
}

export function FormSettingsPanel({
  settings,
  defaultCategory,
  defaultPriority,
  tags = [],
  onChange,
}: FormSettingsPanelProps) {
  const updateSettings = (updates: Partial<FormSettings>) => {
    onChange({
      settings: { ...settings, ...updates },
      defaultCategory,
      defaultPriority,
      tags,
    });
  };

  const updateCategory = (category: string) => {
    onChange({
      settings,
      defaultCategory: category || undefined,
      defaultPriority,
      tags,
    });
  };

  const updatePriority = (priority: TicketPriority | null) => {
    onChange({
      settings,
      defaultCategory,
      defaultPriority: priority,
      tags,
    });
  };

  const updateTags = (newTags: string[]) => {
    onChange({
      settings,
      defaultCategory,
      defaultPriority,
      tags: newTags,
    });
  };

  const handleTagsChange = (value: string) => {
    const tagArray = value
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    updateTags(tagArray);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Form Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Submit Button */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Submit Button</Label>
          <div className="space-y-2">
            <Label>Button Text</Label>
            <Input
              value={settings.submitButton?.text || "Submit"}
              onChange={(e) =>
                updateSettings({
                  submitButton: {
                    ...settings.submitButton,
                    text: e.target.value,
                  },
                })
              }
              placeholder="Submit"
            />
          </div>
          <div className="space-y-2">
            <Label>Button Color</Label>
            <Input
              type="color"
              value={settings.submitButton?.color || "#000000"}
              onChange={(e) =>
                updateSettings({
                  submitButton: {
                    ...settings.submitButton,
                    text: settings.submitButton?.text || "",
                    color: e.target.value,
                  },
                })
              }
              className="h-10 w-full"
            />
          </div>
        </div>

        <Separator />

        {/* Success Message */}
        <div className="space-y-2">
          <Label>Success Message</Label>
          <Textarea
            value={settings.successMessage || ""}
            onChange={(e) =>
              updateSettings({ successMessage: e.target.value || undefined })
            }
            placeholder="Thank you for your submission!"
            rows={3}
          />
        </div>

        {/* Redirect URL */}
        <div className="space-y-2">
          <Label>Redirect URL (optional)</Label>
          <Input
            value={settings.redirectUrl || ""}
            onChange={(e) =>
              updateSettings({ redirectUrl: e.target.value || undefined })
            }
            placeholder="https://example.com/thank-you"
            type="url"
          />
          <p className="text-xs text-muted-foreground">
            Redirect users to this URL after successful submission
          </p>
        </div>

        <Separator />

        {/* Theme */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Theme</Label>
          <div className="space-y-2">
            <Label>Primary Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={settings.theme?.primaryColor || "#000000"}
                onChange={(e) =>
                  updateSettings({
                    theme: {
                      ...settings.theme,
                      primaryColor: e.target.value,
                    },
                  })
                }
                className="h-10 w-20"
              />
              <Input
                value={settings.theme?.primaryColor || "#000000"}
                onChange={(e) =>
                  updateSettings({
                    theme: {
                      ...settings.theme,
                      primaryColor: e.target.value,
                    },
                  })
                }
                placeholder="#000000"
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Border Radius</Label>
            <Input
              value={settings.theme?.borderRadius || "4px"}
              onChange={(e) =>
                updateSettings({
                  theme: {
                    ...settings.theme,
                    borderRadius: e.target.value,
                  },
                })
              }
              placeholder="4px"
            />
          </div>
          <div className="space-y-2">
            <Label>Font Family</Label>
            <Input
              value={settings.theme?.fontFamily || ""}
              onChange={(e) =>
                updateSettings({
                  theme: {
                    ...settings.theme,
                    fontFamily: e.target.value || undefined,
                  },
                })
              }
              placeholder="Arial, sans-serif"
            />
          </div>
        </div>

        <Separator />

        {/* Requirements */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Requirements</Label>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requireEmail"
                checked={settings.requireEmail || false}
                onCheckedChange={(checked) =>
                  updateSettings({ requireEmail: !!checked })
                }
              />
              <Label htmlFor="requireEmail" className="cursor-pointer">
                Always require email field
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requireName"
                checked={settings.requireName || false}
                onCheckedChange={(checked) =>
                  updateSettings({ requireName: !!checked })
                }
              />
              <Label htmlFor="requireName" className="cursor-pointer">
                Always require name field
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showBranding"
                checked={settings.showBranding !== false}
                onCheckedChange={(checked) =>
                  updateSettings({ showBranding: !!checked })
                }
              />
              <Label htmlFor="showBranding" className="cursor-pointer">
                Show branding
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="spamProtection"
                checked={settings.spamProtection || false}
                onCheckedChange={(checked) =>
                  updateSettings({ spamProtection: !!checked })
                }
              />
              <Label htmlFor="spamProtection" className="cursor-pointer">
                Enable spam protection
              </Label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Ticket Settings */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Ticket Settings</Label>
          <div className="space-y-2">
            <Label>Default Category</Label>
            <Input
              value={defaultCategory || ""}
              onChange={(e) => updateCategory(e.target.value)}
              placeholder="General"
            />
          </div>
          <div className="space-y-2">
            <Label>Default Priority</Label>
            <Select
              value={defaultPriority || "__none__"}
              onValueChange={(value) =>
                updatePriority(
                  value === "__none__" ? null : (value as TicketPriority)
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Auto Tags (comma-separated)</Label>
            <Input
              value={tags.join(", ")}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder="support, form, contact"
            />
            <p className="text-xs text-muted-foreground">
              Tags automatically applied to tickets from this form
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
