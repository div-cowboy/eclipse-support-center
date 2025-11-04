/**
 * Form Service
 * Handles all business logic for support forms
 */

import { prisma } from "./prisma";
import {
  SupportForm,
  SupportFormStatus,
  TicketPriority,
  Organization,
  User,
} from "@prisma/client";

// Types
export interface FormField {
  id: string;
  type:
    | "text"
    | "email"
    | "textarea"
    | "select"
    | "checkbox"
    | "radio"
    | "file"
    | "number"
    | "date";
  label: string;
  name: string;
  placeholder?: string;
  required: boolean;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
  options?: Array<{ label: string; value: string }>;
  defaultValue?: string | number | boolean;
  helpText?: string;
  order: number;
}

export interface FormSettings {
  theme?: {
    primaryColor?: string;
    borderRadius?: string;
    fontFamily?: string;
  };
  submitButton?: {
    text: string;
    color?: string;
  };
  successMessage?: string;
  redirectUrl?: string;
  showBranding?: boolean;
  requireEmail?: boolean;
  requireName?: boolean;
  spamProtection?: boolean;
}

export interface CreateFormInput {
  organizationId: string;
  name: string;
  description?: string;
  fields: FormField[];
  settings?: FormSettings;
  defaultValues?: Record<string, any>;
  defaultCategory?: string;
  defaultPriority?: TicketPriority;
  autoAssignToId?: string;
  tags?: string[];
  isPublic?: boolean;
  createdById: string;
}

export interface UpdateFormInput {
  name?: string;
  description?: string;
  fields?: FormField[];
  settings?: FormSettings;
  defaultValues?: Record<string, any>;
  defaultCategory?: string;
  defaultPriority?: TicketPriority;
  autoAssignToId?: string;
  tags?: string[];
  status?: SupportFormStatus;
  isPublic?: boolean;
}

export interface FormFilters {
  organizationId: string;
  status?: SupportFormStatus | SupportFormStatus[];
  isPublic?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "updatedAt" | "name" | "submissionCount";
  sortOrder?: "asc" | "desc";
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
}

/**
 * Generate a short unique embed code (6-8 characters)
 */
function generateEmbedCode(): string {
  // Generate a random alphanumeric string (6-8 chars)
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const length = 6 + Math.floor(Math.random() * 3); // 6-8 characters
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a unique embed code that doesn't exist in the database
 */
async function generateUniqueEmbedCode(): Promise<string> {
  let code = generateEmbedCode();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const existing = await prisma.supportForm.findUnique({
      where: { embedCode: code },
    });

    if (!existing) {
      return code;
    }

    code = generateEmbedCode();
    attempts++;
  }

  // Fallback: use cuid-based approach if random generation fails
  const fallbackCode = `form-${Date.now().toString(36)}`;
  return fallbackCode;
}

/**
 * Create a new form
 */
export async function createForm(
  input: CreateFormInput
): Promise<SupportForm> {
  // Generate unique embed code
  const embedCode = await generateUniqueEmbedCode();

  // Validate fields
  if (!input.fields || input.fields.length === 0) {
    throw new Error("Form must have at least one field");
  }

  // Ensure fields have valid structure
  const validatedFields = input.fields.map((field, index) => ({
    ...field,
    order: field.order ?? index,
  }));

  // Create form
  const form = await prisma.supportForm.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      description: input.description,
      fields: validatedFields as any,
      settings: (input.settings || {}) as any,
      defaultValues: input.defaultValues as any,
      defaultCategory: input.defaultCategory,
      defaultPriority: input.defaultPriority,
      autoAssignToId: input.autoAssignToId,
      tags: input.tags || [],
      isPublic: input.isPublic ?? true,
      status: SupportFormStatus.ACTIVE,
      embedCode,
      createdById: input.createdById,
    },
    include: {
      organization: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return form;
}

/**
 * Get a single form by ID
 */
export async function getForm(
  formId: string
): Promise<(SupportForm & { organization: Organization; createdBy: User }) | null> {
  return prisma.supportForm.findUnique({
    where: { id: formId },
    include: {
      organization: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Get a form by embed code
 */
export async function getFormByEmbedCode(
  embedCode: string
): Promise<(SupportForm & { organization: Organization }) | null> {
  return prisma.supportForm.findUnique({
    where: { embedCode },
    include: {
      organization: true,
    },
  });
}

/**
 * Update a form
 */
export async function updateForm(
  formId: string,
  input: UpdateFormInput
): Promise<SupportForm> {
  const updateData: any = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.fields !== undefined) updateData.fields = input.fields as any;
  if (input.settings !== undefined) updateData.settings = input.settings as any;
  if (input.defaultValues !== undefined)
    updateData.defaultValues = input.defaultValues as any;
  if (input.defaultCategory !== undefined)
    updateData.defaultCategory = input.defaultCategory;
  if (input.defaultPriority !== undefined)
    updateData.defaultPriority = input.defaultPriority;
  if (input.autoAssignToId !== undefined)
    updateData.autoAssignToId = input.autoAssignToId;
  if (input.tags !== undefined) updateData.tags = input.tags;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.isPublic !== undefined) updateData.isPublic = input.isPublic;

  return prisma.supportForm.update({
    where: { id: formId },
    data: updateData,
    include: {
      organization: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * List forms with filters and pagination
 */
export async function listForms(filters: FormFilters) {
  const {
    organizationId,
    status,
    isPublic,
    search,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = filters;

  // Build where clause
  const where: any = {
    organizationId,
  };

  if (status) {
    where.status = Array.isArray(status) ? { in: status } : status;
  }

  if (isPublic !== undefined) {
    where.isPublic = isPublic;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  // Count total
  const total = await prisma.supportForm.count({ where });

  // Fetch forms
  const forms = await prisma.supportForm.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { [sortBy]: sortOrder },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return {
    forms,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Archive a form (soft delete)
 */
export async function archiveForm(formId: string): Promise<SupportForm> {
  return prisma.supportForm.update({
    where: { id: formId },
    data: { status: SupportFormStatus.ARCHIVED },
    include: {
      organization: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Delete a form (hard delete)
 */
export async function deleteForm(formId: string): Promise<void> {
  await prisma.supportForm.delete({
    where: { id: formId },
  });
}

/**
 * Increment submission count for a form
 */
export async function incrementSubmissionCount(
  formId: string
): Promise<SupportForm> {
  return prisma.supportForm.update({
    where: { id: formId },
    data: {
      submissionCount: { increment: 1 },
      lastSubmittedAt: new Date(),
    },
  });
}

/**
 * Validate form submission against form configuration
 */
export function validateFormSubmission(
  formConfig: SupportForm,
  formData: Record<string, any>
): ValidationResult {
  const errors: Array<{ field: string; message: string }> = [];
  const fields = formConfig.fields as any as FormField[];

  // Validate each field
  for (const field of fields) {
    const value = formData[field.name];

    // Check required fields
    if (field.required && (value === undefined || value === null || value === "")) {
      errors.push({
        field: field.name,
        message: `${field.label} is required`,
      });
      continue;
    }

    // Skip validation if field is empty and not required
    if (value === undefined || value === null || value === "") {
      continue;
    }

    // Type-specific validation
    if (field.type === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof value === "string" && !emailRegex.test(value)) {
        errors.push({
          field: field.name,
          message: `${field.label} must be a valid email address`,
        });
      }
    }

    if (field.type === "number") {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        errors.push({
          field: field.name,
          message: `${field.label} must be a number`,
        });
      } else {
        if (field.validation?.min !== undefined && numValue < field.validation.min) {
          errors.push({
            field: field.name,
            message: `${field.label} must be at least ${field.validation.min}`,
          });
        }
        if (field.validation?.max !== undefined && numValue > field.validation.max) {
          errors.push({
            field: field.name,
            message: `${field.label} must be at most ${field.validation.max}`,
          });
        }
      }
    }

    if (field.type === "text" || field.type === "textarea") {
      const strValue = String(value);
      if (field.validation?.minLength && strValue.length < field.validation.minLength) {
        errors.push({
          field: field.name,
          message: `${field.label} must be at least ${field.validation.minLength} characters`,
        });
      }
      if (field.validation?.maxLength && strValue.length > field.validation.maxLength) {
        errors.push({
          field: field.name,
          message: `${field.label} must be at most ${field.validation.maxLength} characters`,
        });
      }
      if (field.validation?.pattern) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(strValue)) {
          errors.push({
            field: field.name,
            message: `${field.label} format is invalid`,
          });
        }
      }
    }

    // Validate select/radio/checkbox options
    if (
      (field.type === "select" || field.type === "radio") &&
      field.options
    ) {
      const validValues = field.options.map((opt) => opt.value);
      if (!validValues.includes(value)) {
        errors.push({
          field: field.name,
          message: `${field.label} must be one of the allowed values`,
        });
      }
    }
  }

  // Check form-level requirements
  const settings = formConfig.settings as any as FormSettings;
  if (settings?.requireEmail && !formData.email) {
    errors.push({
      field: "email",
      message: "Email is required",
    });
  }
  if (settings?.requireName && !formData.name) {
    errors.push({
      field: "name",
      message: "Name is required",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

