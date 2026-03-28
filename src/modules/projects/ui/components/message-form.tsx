import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { z } from "zod";

import { PROJECT_TEMPLATES } from "@/constants";
import { CODE_AGENT_PRESETS } from "@/constants/agent-code";
import { REFERENCE_IMAGE_MAX_BYTES } from "@/constants/vision-upload";
import { Button } from "@/components/ui/button";
import { Form, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { MessageRole, MessageType } from "@/generated/prisma";
import { useTRPC } from "@/trpc/client";
import { Usage } from "./usage";

interface MessageFormProps {
  projectId: string;
  prefillTargetPath?: string;
  onPrefillTargetConsumed?: () => void;
}

const formSchema = z.object({
  value: z
    .string()
    .min(1, { message: "Value is required" })
    .max(10_000, { message: "Value is too long" }),
});

const MessageForm = ({
  projectId,
  prefillTargetPath,
  onPrefillTargetConsumed,
}: MessageFormProps) => {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: usage } = useQuery(trpc.usage.status.queryOptions());

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      value: "",
    },
  });

  const createMessage = useMutation(
    trpc.messages.create.mutationOptions({
      onMutate: async (vars) => {
        await queryClient.cancelQueries(
          trpc.messages.getMany.queryOptions({ projectId: vars.projectId }),
        );
        const key = trpc.messages.getMany.queryOptions({
          projectId: vars.projectId,
        }).queryKey;
        const prev = queryClient.getQueryData(key);
        const optimistic = {
          id: `optimistic-${Date.now()}`,
          content: vars.value,
          role: "USER" as MessageRole,
          type: "RESULT" as MessageType,
          runStatus: "PENDING" as const,
          runId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          projectId: vars.projectId,
          fragment: null,
        };
        queryClient.setQueryData(
          key,
          (old) =>
            [...((old as never[] | undefined) ?? []), optimistic] as never,
        );
        return { prev };
      },
      onError: (error, vars, ctx) => {
        if (ctx?.prev !== undefined) {
          queryClient.setQueryData(
            trpc.messages.getMany.queryOptions({ projectId: vars.projectId })
              .queryKey,
            ctx.prev,
          );
        }
        if (error.data?.code === "TOO_MANY_REQUESTS") {
          router.push("/pricing");
        }
        if (error.data?.code === "CONFLICT") {
          toast.error("Generation already running. Cancel or wait for completion.");
          return;
        }
        toast.error(error.message || "Failed to start generation.");
      },
      onSuccess: (data) => {
        form.reset();
        setReferenceImage(null);
        queryClient.invalidateQueries(
          trpc.messages.getMany.queryOptions({ projectId: data.projectId })
        );
        queryClient.invalidateQueries(trpc.usage.status.queryOptions());
        queryClient.invalidateQueries(
          trpc.jobs.latestForProject.queryOptions({ projectId: data.projectId }),
        );
      },
    })
  );

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await createMessage.mutateAsync({
      value: values.value,
      projectId,
      runMode: debugRun ? "debug" : undefined,
      visualTarget: targetFile.trim()
        ? { path: targetFile.trim(), selector: undefined }
        : undefined,
      ...(modelPreset.trim()
        ? { codeAgentPresetId: modelPreset.trim() }
        : {}),
      ...(referenceImage
        ? {
            referenceImage: {
              mimeType: referenceImage.mimeType,
              base64: referenceImage.base64,
            },
          }
        : {}),
    });
  };

  const [targetFile, setTargetFile] = useState("");
  /** Empty = server default from env / inferred keys */
  const [modelPreset, setModelPreset] = useState("");
  const [referenceImage, setReferenceImage] = useState<{
    mimeType: "image/png" | "image/jpeg" | "image/webp";
    base64: string;
    previewUrl: string;
  } | null>(null);
  const [debugRun, setDebugRun] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!prefillTargetPath?.trim()) return;
    setTargetFile(prefillTargetPath.trim());
    onPrefillTargetConsumed?.();
  }, [prefillTargetPath, onPrefillTargetConsumed]);
  const showUsage = !!usage;
  const isPending = createMessage.isPending;
  const isDisabled = isPending || !form.formState.isValid;

  return (
    <Form {...form}>
      {showUsage && (
        <Usage
          points={usage.remainingPoints}
          msBeforeNext={usage.msBeforeNext}
        />
      )}
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn(
          "relative border p-4 pt-1 rounded-xl bg-sidebar dark:bg-sidebar transition-all",
          isFocused && "shadow-xs",
          showUsage && "rounded-t-none"
        )}
      >
        <div className="flex flex-col gap-2 border-b border-border/60 pb-2 pt-1 sm:flex-row sm:items-end">
          <div className="min-w-[9rem] space-y-1">
            <Label className="text-[10px] text-muted-foreground">
              Code model
            </Label>
            <select
              value={modelPreset}
              onChange={(e) => setModelPreset(e.target.value)}
              disabled={isPending}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Default (env)</option>
              {CODE_AGENT_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-[10px] text-muted-foreground">
              Target file (visual edit)
            </Label>
            <Input
              value={targetFile}
              onChange={(e) => setTargetFile(e.target.value)}
              placeholder="e.g. app/page.tsx"
              className="h-8 font-mono text-xs"
              disabled={isPending}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={debugRun}
              onChange={(e) => setDebugRun(e.target.checked)}
              disabled={isPending}
              className="accent-primary"
            />
            AI debugger run
          </label>
          <div className="flex flex-col gap-1 sm:items-end">
            <Label className="text-[10px] text-muted-foreground">
              UI screenshot (optional)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="h-8 cursor-pointer text-xs file:mr-2 file:text-xs"
                disabled={isPending}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) {
                    setReferenceImage(null);
                    return;
                  }
                  if (f.size > REFERENCE_IMAGE_MAX_BYTES) {
                    toast.error(
                      `Image too large. Max ${Math.round(REFERENCE_IMAGE_MAX_BYTES / 1024)} KB.`,
                    );
                    setReferenceImage(null);
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    const dataUrl = String(reader.result || "");
                    const m = dataUrl.match(
                      /^data:(image\/png|image\/jpeg|image\/webp);base64,(.+)$/,
                    );
                    if (!m) {
                      toast.error("Could not read image.");
                      setReferenceImage(null);
                      return;
                    }
                    setReferenceImage({
                      mimeType: m[1] as
                        | "image/png"
                        | "image/jpeg"
                        | "image/webp",
                      base64: m[2],
                      previewUrl: dataUrl,
                    });
                  };
                  reader.onerror = () => {
                    toast.error("Could not read file.");
                    setReferenceImage(null);
                  };
                  reader.readAsDataURL(f);
                }}
              />
              {referenceImage ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 px-2 text-xs"
                  disabled={isPending}
                  onClick={() => setReferenceImage(null)}
                >
                  Clear
                </Button>
              ) : null}
            </div>
            {referenceImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={referenceImage.previewUrl}
                alt=""
                className="mt-1 max-h-16 max-w-[120px] rounded border object-cover"
              />
            ) : null}
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PROJECT_TEMPLATES.slice(0, 4).map((t) => (
            <Button
              key={t.title}
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 shrink-0 rounded-full px-2.5 text-[11px]"
              disabled={isPending}
              onClick={() =>
                form.setValue("value", t.prompt, {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                })
              }
            >
              {t.emoji} {t.title}
            </Button>
          ))}
        </div>
        <FormField
          control={form.control}
          name="value"
          render={({ field }) => (
            <TextareaAutosize
              {...field}
              placeholder="What would you like to build?"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              minRows={2}
              maxRows={8}
              className="pt-4 resize-none border-none w-full outline-none bg-transparent"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  form.handleSubmit(onSubmit)(e);
                }
              }}
              disabled={isPending}
            />
          )}
        />

        <div className="flex gap-x-2 items-end justify-between pt-2">
          <div className="text-[10px] text-muted-foreground font-mono">
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span>&#8984;</span>Enter
            </kbd>
            &nbsp;to submit
          </div>
          <Button
            className={cn(
              "size-8 rounded-full",
              isDisabled && "bg-muted-foreground border"
            )}
            disabled={isDisabled}
          >
            {isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <ArrowUpIcon />
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export { MessageForm };
