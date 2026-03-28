"use client";

import { useAuth } from "@clerk/nextjs";
import { CodeIcon, CrownIcon, EyeIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";

import { FileExplorer } from "@/components/file-explorer";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserControl } from "@/components/user-control";
import { CLERK_PRO_PLAN_CLAIM } from "@/config/billing";
import { Fragment } from "@/generated/prisma";
import { useEffectiveProjectRun } from "@/hooks/use-effective-project-run";
import type { RunProgressJson } from "@/lib/run-progress";
import { FileCollection } from "@/types";
import { MessagesContainer } from "../components/messages-container";
import { PreviewPanel } from "../components/preview-panel";
import { ProjectHeader } from "../components/project-header";
import { ProjectShipPanel } from "../components/project-ship-panel";
import { ErrorBoundary } from "react-error-boundary";
import { useSearchParams } from "next/navigation";

interface ProjectViewProps {
  projectId: string;
}

const ProjectView = ({ projectId }: ProjectViewProps) => {
  const { has } = useAuth();
  const hasProAccess = has?.({ plan: CLERK_PRO_PLAN_CLAIM });
  const effectiveRun = useEffectiveProjectRun(projectId);
  const runProgress =
    (effectiveRun?.progress as RunProgressJson | null | undefined) ?? null;
  const isRunGenerating =
    effectiveRun?.status === "PENDING" || effectiveRun?.status === "RUNNING";

  const [activeFragment, setActiveFragment] = useState<Fragment | null>(null);

  const optimisticPreviewFragment = useMemo((): Fragment | null => {
    if (!isRunGenerating || !runProgress?.previewSandboxUrl) return null;
    const fromFragment =
      activeFragment?.files && typeof activeFragment.files === "object"
        ? (activeFragment.files as FileCollection)
        : {};
    const fromProgress = runProgress.partialPreview ?? {};
    const files = { ...fromFragment, ...fromProgress };
    return {
      id: "__run-preview__",
      messageId: "__run-preview__",
      sandboxUrl: runProgress.previewSandboxUrl,
      title: "Building…",
      files,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    } as Fragment;
  }, [
    activeFragment?.files,
    isRunGenerating,
    runProgress?.partialPreview,
    runProgress?.previewSandboxUrl,
  ]);

  const previewFragment = optimisticPreviewFragment ?? activeFragment;

  const codeTabFiles = useMemo((): FileCollection => {
    const base =
      activeFragment?.files && typeof activeFragment.files === "object"
        ? (activeFragment.files as FileCollection)
        : {};
    if (isRunGenerating && runProgress?.partialPreview) {
      return { ...base, ...runProgress.partialPreview };
    }
    return base;
  }, [
    activeFragment?.files,
    isRunGenerating,
    runProgress?.partialPreview,
  ]);
  const [tabState, setTabState] = useState<"preview" | "code">("preview");
  const [shipOpen, setShipOpen] = useState(false);
  const [visualPrefillPath, setVisualPrefillPath] = useState<string | null>(
    null,
  );
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("ship") === "github") {
      setShipOpen(true);
    }
  }, [searchParams]);

  return (
    <div className="h-screen">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          defaultSize={35}
          minSize={20}
          className="flex flex-col min-h-0"
        >
          <ErrorBoundary fallback={<p>Error...</p>}>
            <Suspense fallback={<p>Loading project...</p>}>
              <ProjectHeader
                projectId={projectId}
                onOpenShip={() => setShipOpen(true)}
              />
            </Suspense>
          </ErrorBoundary>
          <ErrorBoundary fallback={<p>Error...</p>}>
            <Suspense fallback={<p>Loading messages...</p>}>
              <MessagesContainer
                projectId={projectId}
                activeFragment={activeFragment}
                setActiveFragment={setActiveFragment}
                effectiveRun={effectiveRun}
                visualPrefillPath={visualPrefillPath}
                onVisualPrefillConsumed={() => setVisualPrefillPath(null)}
              />
            </Suspense>
          </ErrorBoundary>
        </ResizablePanel>
        <ResizableHandle className="hover:bg-primary transition-colors" />
        <ResizablePanel
          defaultSize={65}
          minSize={50}
          className="flex min-h-0 flex-col"
        >
          <Tabs
            className="flex h-full min-h-0 flex-col gap-y-0"
            defaultValue="preview"
            value={tabState}
            onValueChange={(newValue) =>
              setTabState(newValue as "preview" | "code")
            }
          >
            <div className="w-full flex items-center p-2 border-b gap-x-2">
              <TabsList className="h-8 p-0 border rounded-md">
                <TabsTrigger value="preview" className="rounded-md">
                  <EyeIcon />
                  <span>Demo</span>
                </TabsTrigger>
                <TabsTrigger value="code" className="rounded-md">
                  <CodeIcon />
                  <span>Code</span>
                </TabsTrigger>
              </TabsList>
              <div className="ml-auto flex items-center gap-x-2">
                {!hasProAccess && (
                  <Button asChild size="sm" variant="tertiary">
                    <Link href="/pricing">
                      <CrownIcon />
                      Upgrade
                    </Link>
                  </Button>
                )}
                <UserControl />
              </div>
            </div>
            <TabsContent
              value="preview"
              className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
            >
              <PreviewPanel
                activeFragment={previewFragment}
                runStatus={effectiveRun?.status}
                errorMessage={effectiveRun?.errorMessage}
                progress={runProgress}
                onVisualPick={({ path }) => {
                  setVisualPrefillPath(path);
                  setTabState("preview");
                }}
              />
            </TabsContent>
            <TabsContent
              value="code"
              className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
            >
              {Object.keys(codeTabFiles).length > 0 ? (
                <FileExplorer files={codeTabFiles} />
              ) : isRunGenerating ? (
                <div className="flex min-h-[280px] flex-col justify-center gap-3 border bg-muted/15 p-6 text-center text-sm">
                  <Loader2Icon className="text-primary mx-auto size-8 animate-spin" />
                  <p className="text-foreground font-medium">
                    {runProgress?.label ?? "Updating codebase…"}
                  </p>
                  {runProgress?.changedPaths?.length ? (
                    <ul className="text-muted-foreground mx-auto max-h-44 max-w-lg list-inside list-disc overflow-y-auto text-left font-mono text-[11px]">
                      {runProgress.changedPaths.map((p) => (
                        <li key={p} className="truncate">
                          {p}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground px-4 text-xs">
                      Patched paths will list here as the agent writes files.
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground flex min-h-[200px] items-center justify-center p-6 text-center text-sm">
                  No code yet. Finish a generation or open a version from Ship.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
      <ProjectShipPanel
        projectId={projectId}
        open={shipOpen}
        onOpenChange={setShipOpen}
        onSelectFragment={(fragment) => {
          setActiveFragment(fragment);
          setTabState("preview");
        }}
      />
    </div>
  );
};

export { ProjectView };
