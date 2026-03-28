import { z } from "zod";

import { FileCollection } from "@/types";

const summarySchema = z
  .string()
  .refine((value) => value.includes("<task_summary>"), {
    message: "Summary must include <task_summary> tag",
  })
  .refine((value) => value.includes("</task_summary>"), {
    message: "Summary must include </task_summary> tag",
  })
  .superRefine((value, ctx) => {
    const inner = value
      .replace(/<\/?task_summary>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (inner.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Summary must include meaningful task description",
      });
    }
  });

const filesSchema = z
  .record(z.string())
  .refine((files) => Object.keys(files).length > 0, {
    message: "At least one file must be generated",
  })
  .refine((files) => Object.keys(files).length <= 200, {
    message: "Too many files generated",
  })
  .superRefine((files, ctx) => {
    for (const [path, content] of Object.entries(files)) {
      const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "");
      if (
        normalized.startsWith("../") ||
        normalized.includes("/../") ||
        normalized.length > 220
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unsafe file path detected: ${path}`,
        });
      }
      if (content.length > 400_000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `File is too large: ${path}`,
        });
      }
    }
  });

const outputSchema = z.object({
  summary: summarySchema,
  files: filesSchema,
});

export type ValidAgentOutput = z.infer<typeof outputSchema>;

export function validateAgentOutput(input: {
  summary: string;
  files: FileCollection;
}): ValidAgentOutput {
  return outputSchema.parse(input);
}

export function safeParseAgentOutput(input: {
  summary: string;
  files: FileCollection;
}):
  | { ok: true; data: ValidAgentOutput }
  | { ok: false; errorText: string } {
  const r = outputSchema.safeParse(input);
  if (r.success) return { ok: true, data: r.data };
  const errorText = r.error.issues
    .map((i) => `${i.path.join(".") || "output"}: ${i.message}`)
    .join("\n");
  return { ok: false, errorText };
}
