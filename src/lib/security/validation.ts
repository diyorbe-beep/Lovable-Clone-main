import { z } from 'zod';

// Common validation schemas
export const idSchema = z.string().uuid('Invalid ID format');

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const searchSchema = z.object({
  query: z.string().min(1).max(500).trim(),
  filters: z.record(z.any()).optional(),
});

// Project validation schemas
export const createProjectSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  workspaceId: idSchema.optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  workspaceId: idSchema.optional(),
});

// Message validation schemas
export const createMessageSchema = z.object({
  content: z.string().min(1).max(10000).trim(),
  projectId: idSchema,
  type: z.enum(['RESULT', 'ERROR']).default('RESULT'),
});

export const updateMessageSchema = z.object({
  content: z.string().min(1).max(10000).trim().optional(),
  type: z.enum(['RESULT', 'ERROR']).optional(),
});

// Workspace validation schemas
export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).trim(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
});

// Membership validation schemas
export const createMembershipSchema = z.object({
  workspaceId: idSchema,
  userId: z.string().min(1),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']).default('MEMBER'),
});

export const updateMembershipSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
});

// Job run validation schemas
export const createJobRunSchema = z.object({
  projectId: idSchema,
  input: z.string().min(1).max(5000).trim(),
  promptVersion: z.string().optional(),
});

export const updateJobRunSchema = z.object({
  status: z.enum(['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED']).optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().max(1000).optional(),
  summary: z.string().max(1000).optional(),
});

// AI Generation validation schemas
export const generateComponentSchema = z.object({
  prompt: z.string().min(1).max(2000).trim(),
  framework: z.enum(['react', 'vue', 'angular', 'svelte']).default('react'),
  styling: z.enum(['tailwind', 'css', 'scss', 'styled-components']).default('tailwind'),
  typescript: z.boolean().default(true),
});

export const generateAppSchema = z.object({
  description: z.string().min(1).max(3000).trim(),
  features: z.array(z.string().max(100)).max(10).optional(),
  techStack: z.array(z.string().max(50)).max(5).optional(),
});

// User validation schemas
export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).trim().optional(),
  image: z.string().url().optional(),
});

// Billing validation schemas
export const createSubscriptionSchema = z.object({
  planId: z.string().min(1),
  paymentMethodId: z.string().min(1),
});

export const updateSubscriptionSchema = z.object({
  planId: z.string().min(1).optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
});

// Usage validation schemas
export const recordUsageSchema = z.object({
  userId: z.string().min(1),
  points: z.number().min(1),
  type: z.enum(['GENERATION', 'API_CALL', 'STORAGE']),
  metadata: z.record(z.any()).optional(),
});

// Security validation schemas
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const emailSchema = z.string().email('Invalid email format');

export const apiKeySchema = z.string()
  .min(32, 'API key must be at least 32 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'API key can only contain alphanumeric characters, underscores, and hyphens');

// Validation helper functions
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: string[];
} {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Validation failed'] };
  }
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

export function validateFileUpload(file: File): {
  isValid: boolean;
  error?: string;
} {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'application/json',
    'text/javascript',
    'text/typescript',
  ];

  if (file.size > maxSize) {
    return { isValid: false, error: 'File size exceeds 10MB limit' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'File type not allowed' };
  }

  return { isValid: true };
}
