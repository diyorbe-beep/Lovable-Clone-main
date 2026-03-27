import { TRPCError } from "@trpc/server";

export const ERROR_CODES = {
  USAGE_LIMIT_EXCEEDED: "USAGE_LIMIT_EXCEEDED",
  USAGE_CONFIGURATION_ERROR: "USAGE_CONFIGURATION_ERROR",
  INNGEST_DISPATCH_FAILED: "INNGEST_DISPATCH_FAILED",
  PROJECT_NOT_FOUND: "PROJECT_NOT_FOUND",
  AUTH_REQUIRED: "AUTH_REQUIRED",
  RUN_ALREADY_ACTIVE: "RUN_ALREADY_ACTIVE",
  RUN_NOT_FOUND: "RUN_NOT_FOUND",
  RUN_CANCELLED: "RUN_CANCELLED",
  RUN_TIMEOUT: "RUN_TIMEOUT",
} as const;

export class AppError extends Error {
  constructor(
    public readonly code: (typeof ERROR_CODES)[keyof typeof ERROR_CODES],
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toTRPCError(error: unknown): TRPCError {
  if (error instanceof TRPCError) return error;

  if (error instanceof AppError) {
    if (error.code === ERROR_CODES.USAGE_LIMIT_EXCEEDED) {
      return new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: error.message,
        cause: error.cause,
      });
    }

    if (error.code === ERROR_CODES.PROJECT_NOT_FOUND) {
      return new TRPCError({
        code: "NOT_FOUND",
        message: error.message,
        cause: error.cause,
      });
    }

    if (error.code === ERROR_CODES.RUN_NOT_FOUND) {
      return new TRPCError({
        code: "NOT_FOUND",
        message: error.message,
        cause: error.cause,
      });
    }

    if (error.code === ERROR_CODES.RUN_ALREADY_ACTIVE) {
      return new TRPCError({
        code: "CONFLICT",
        message: error.message,
        cause: error.cause,
      });
    }

    return new TRPCError({
      code: "BAD_REQUEST",
      message: error.message,
      cause: error.cause,
    });
  }

  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Unexpected server error",
    cause: error,
  });
}
