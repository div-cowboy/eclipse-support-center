"use client";

import { useState } from "react";
import { Button } from "@/components/shadcn/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/ui/tabs";
import {
  Plus,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Trash2,
  Edit2,
} from "lucide-react";
import { FormFieldEditor } from "./FormFieldEditor";
import { FormSettingsPanel } from "./FormSettingsPanel";
import { FormPreview } from "./FormPreview";
import type { FormField, FormSettings } from "@/lib/form-service";
import { TicketPriority } from "@prisma/client";

interface FormBuilderProps {
  fields: FormField[];
  settings: FormSettings;
  defaultCategory?: string;
  defaultPriority?: TicketPriority | null;
  tags?: string[];
  onChange: (data: {
    fields: FormField[];
    settings: FormSettings;
    defaultCategory?: string;
    defaultPriority?: TicketPriority | null;
    tags?: string[];
  }) => void;
}

export function FormBuilder({
  fields: initialFields,
  settings: initialSettings,
  defaultCategory: initialDefaultCategory,
  defaultPriority: initialDefaultPriority,
  tags: initialTags = [],
  onChange,
}: FormBuilderProps) {
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [settings, setSettings] = useState<FormSettings>(initialSettings);
  const [defaultCategory, setDefaultCategory] = useState(initialDefaultCategory);
  const [defaultPriority, setDefaultPriority] = useState(initialDefaultPriority);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const updateFields = (newFields: FormField[]) => {
    setFields(newFields);
    notifyChange(newFields, settings);
  };

  const updateSettings = (newSettings: {
    settings: FormSettings;
    defaultCategory?: string;
    defaultPriority?: TicketPriority | null;
    tags?: string[];
  }) => {
    setSettings(newSettings.settings);
    if (newSettings.defaultCategory !== undefined) {
      setDefaultCategory(newSettings.defaultCategory);
    }
    if (newSettings.defaultPriority !== undefined) {
      setDefaultPriority(newSettings.defaultPriority);
    }
    if (newSettings.tags !== undefined) {
      setTags(newSettings.tags);
    }
    notifyChange(fields, newSettings.settings);
  };

  const notifyChange = (currentFields: FormField[], currentSettings: FormSettings) => {
    onChange({
      fields: currentFields,
      settings: currentSettings,
      defaultCategory,
      defaultPriority,
      tags,
    });
  };

  const addField = () => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type: "text",
      label: "New Field",
      name: `field_${Date.now()}`,
      required: false,
      order: fields.length,
    };
    const newFields = [...fields, newField];
    updateFields(newFields);
    setSelectedFieldId(newField.id);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    const newFields = fields.map((field) =>
      field.id === fieldId ? { ...field, ...updates } : field
    );
    updateFields(newFields);
  };

  const deleteField = (fieldId: string) => {
    const newFields = fields
      .filter((field) => field.id !== fieldId)
      .map((field, index) => ({ ...field, order: index }));
    updateFields(newFields);
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  const moveField = (fieldId: string, direction: "up" | "down") => {
    const index = fields.findIndex((f) => f.id === fieldId);
    if (index === -1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;

    const newFields = [...fields];
    [newFields[index], newFields[newIndex]] = [
      newFields[newIndex],
      newFields[index],
    ];
    // Update order values
    newFields.forEach((field, idx) => {
      field.order = idx;
    });
    updateFields(newFields);
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="fields" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="fields">Fields</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* Fields Tab */}
        <TabsContent value="fields" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fields List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Form Fields</CardTitle>
                  <Button onClick={addField} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {sortedFields.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="mb-2">No fields yet</p>
                    <Button onClick={addField} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Field
                    </Button>
                  </div>
                ) : (
                  sortedFields.map((field, index) => (
                    <div
                      key={field.id}
                      className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedFieldId === field.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedFieldId(field.id)}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{field.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {field.type} {field.required && "(required)"}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveField(field.id, "up");
                          }}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveField(field.id, "down");
                          }}
                          disabled={index === sortedFields.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFieldId(field.id);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteField(field.id);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Field Editor */}
            {selectedField ? (
              <FormFieldEditor
                field={selectedField}
                onChange={(updatedField) =>
                  updateField(selectedField.id, updatedField)
                }
                onDelete={() => deleteField(selectedField.id)}
              />
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-full min-h-[400px]">
                  <div className="text-center text-muted-foreground">
                    <p>Select a field to edit</p>
                    <p className="text-sm mt-2">
                      Click on a field from the list or add a new one
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <FormSettingsPanel
            settings={settings}
            defaultCategory={defaultCategory}
            defaultPriority={defaultPriority}
            tags={tags}
            onChange={updateSettings}
          />
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview">
          <FormPreview fields={fields} settings={settings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

