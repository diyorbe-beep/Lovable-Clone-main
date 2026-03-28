"use client";

import type { Fragment } from "@/generated/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CopyIcon,
  ExternalLinkIcon,
  Loader2Icon,
  PackageIcon,
  RocketIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import JSZip from "jszip";

interface ProjectShipPanelProps {
  projectId: string;
  open: boolean;
  /** Sheet visibility */
  // eslint-disable-next-line no-unused-vars
  onOpenChange: (open: boolean) => void;
  /** Load a historical fragment into the workspace */
  // eslint-disable-next-line no-unused-vars
  onSelectFragment: (fragment: Fragment) => void;
}

export function ProjectShipPanel({
  projectId,
  open,
  onOpenChange,
  onSelectFragment,
}: ProjectShipPanelProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const shipToastKey = useRef<string | null>(null);

  const [activeTab, setActiveTab] = useState("versions");

  const { data: history, isLoading: historyLoading } = useQuery(
    trpc.projects.listRunHistory.queryOptions(
      { projectId },
      { enabled: open },
    ),
  );

  const { data: snapshots, isLoading: snapshotsLoading } = useQuery(
    trpc.projects.listSnapshots.queryOptions(
      { projectId },
      { enabled: open },
    ),
  );

  const { data: ghIntegration, isLoading: ghLoading } = useQuery({
    ...trpc.integrations.githubStatus.queryOptions(),
    enabled: open,
  });

  const defaultRunId = history?.[0]?.runId ?? "";

  const [exportRunId, setExportRunId] = useState("");
  const [githubOwner, setGithubOwner] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [githubBranch, setGithubBranch] = useState("main");
  const [githubToken, setGithubToken] = useState("");
  const [githubRunId, setGithubRunId] = useState("");

  const [exporting, setExporting] = useState(false);

  const ghConnected = Boolean(ghIntegration?.connected);
  const connectHref = `/api/oauth/github/start?next=${encodeURIComponent(`/projects/${projectId}`)}`;

  useEffect(() => {
    if (!open) return;
    if (searchParams.get("ship") !== "github") return;
    setActiveTab("github");
    const key = searchParams.toString();
    if (shipToastKey.current === key) return;
    shipToastKey.current = key;
    if (searchParams.get("connected")) {
      toast.success("GitHub connected");
      void queryClient.invalidateQueries(
        trpc.integrations.githubStatus.queryOptions(),
      );
    }
    const err = searchParams.get("error");
    if (err) {
      toast.error(err.replace(/_/g, " "));
    }
  }, [open, searchParams, queryClient, trpc.integrations.githubStatus]);

  const disconnectGh = useMutation(
    trpc.integrations.disconnectGitHub.mutationOptions({
      onSuccess: () => {
        toast.message("GitHub disconnected");
        void queryClient.invalidateQueries(
          trpc.integrations.githubStatus.queryOptions(),
        );
      },
      onError: (e) => toast.error(e.message),
    }),
  );

  const triggerDeploy = useMutation(
    trpc.integrations.triggerVercelDeploy.mutationOptions({
      onSuccess: () => toast.success("Deploy triggered"),
      onError: (e) => toast.error(e.message),
    }),
  );

  const restoreSnapshot = useMutation(
    trpc.projects.restoreFromSnapshot.mutationOptions({
      onSuccess: (msg) => {
        toast.success("Version restored into chat");
        if (msg.fragment) {
          onSelectFragment(msg.fragment as unknown as Fragment);
        }
        void queryClient.invalidateQueries(
          trpc.messages.getMany.queryOptions({ projectId }),
        );
        onOpenChange(false);
      },
      onError: (e) => toast.error(e.message),
    }),
  );

  const duplicateFromSnapshot = useMutation(
    trpc.projects.duplicate.mutationOptions({
      onSuccess: (data) => {
        void queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
        toast.success("New project created from this snapshot");
        onOpenChange(false);
        router.push(`/projects/${data.id}`);
      },
      onError: (e) => toast.error(e.message),
    }),
  );

  const shipAll = useMutation(
    trpc.projects.shipAll.mutationOptions({
      onSuccess: (data) => {
        toast.success(
          data.deployTriggered
            ? "Pushed to GitHub and deploy hook fired"
            : "Pushed to GitHub",
        );
        if (data.commitHtmlUrl) {
          window.open(data.commitHtmlUrl, "_blank", "noopener,noreferrer");
        }
        setGithubToken("");
      },
      onError: (e) => toast.error(e.message),
    }),
  );

  const pushGithub = useMutation(
    trpc.projects.pushToGitHub.mutationOptions({
      onSuccess: (data) => {
        toast.success("Pushed to GitHub");
        window.open(data.commitHtmlUrl, "_blank", "noopener,noreferrer");
        setGithubToken("");
      },
      onError: (e) => toast.error(e.message),
    }),
  );

  const historyItems = useMemo(() => history ?? [], [history]);

  useEffect(() => {
    if (!open || historyItems.length === 0) return;
    const first = historyItems[0]?.runId;
    if (!first) return;
    setExportRunId((prev) => (prev ? prev : first));
    setGithubRunId((prev) => (prev ? prev : first));
  }, [open, historyItems]);

  const handleDownloadZip = async () => {
    const runId = exportRunId || defaultRunId;
    if (!runId) {
      toast.error("No successful build to export yet.");
      return;
    }
    setExporting(true);
    try {
      const payload = await queryClient.fetchQuery(
        trpc.projects.getRunExport.queryOptions({ projectId, runId }),
      );
      const zip = new JSZip();
      for (const [path, content] of Object.entries(payload.files)) {
        const safe = path.replace(/^\/+/, "");
        if (!safe || safe.includes("..")) continue;
        zip.file(safe, content);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lovable-clone-${projectId.slice(0, 8)}-${runId.slice(0, 8)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md"
      >
        <SheetHeader className="pb-4 text-left">
          <SheetTitle className="flex items-center gap-2">
            <RocketIcon className="size-5" />
            Ship
          </SheetTitle>
          <SheetDescription>
            Versions, source export, GitHub, and deploy — similar to Lovable’s
            “ship” loop (without their hosted infra).
          </SheetDescription>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col gap-4"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="versions">Versions</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="github">GitHub</TabsTrigger>
          </TabsList>

          <TabsContent value="versions" className="flex flex-col gap-3">
            <p className="text-muted-foreground text-xs">
              Open a past successful build in the code preview and demo tabs.
            </p>
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2Icon className="text-muted-foreground size-6 animate-spin" />
              </div>
            ) : historyItems.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No finished generations yet. Run the agent first.
              </p>
            ) : (
              <ul className="max-h-[40vh] space-y-2 overflow-y-auto pr-1">
                {historyItems.map((item) => (
                  <li
                    key={item.runId}
                    className="bg-muted/40 space-y-2 rounded-lg border p-3"
                  >
                    <div className="text-muted-foreground text-[11px]">
                      {item.finishedAt
                        ? format(new Date(item.finishedAt), "PPp")
                        : "—"}{" "}
                      · <span className="line-clamp-2">{item.promptPreview}</span>
                    </div>
                    <p className="text-sm font-medium line-clamp-2">
                      {item.fragment.title}
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full"
                      onClick={() => {
                        onSelectFragment(item.fragment as unknown as Fragment);
                        toast.message("Loaded build in workspace");
                        onOpenChange(false);
                      }}
                    >
                      Open this version
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t pt-3">
              <p className="text-muted-foreground mb-2 text-xs font-medium">
                Saved snapshots (time travel)
              </p>
              {snapshotsLoading ? (
                <Loader2Icon className="text-muted-foreground size-5 animate-spin" />
              ) : !snapshots?.length ? (
                <p className="text-muted-foreground text-xs">
                  Snapshots appear after each successful generation.
                </p>
              ) : (
                <ul className="max-h-[32vh] space-y-2 overflow-y-auto pr-1">
                  {snapshots.map((s) => (
                    <li
                      key={s.id}
                      className="bg-muted/30 space-y-2 rounded-lg border p-2.5"
                    >
                      <p className="text-[11px] font-medium line-clamp-1">
                        {s.label}
                      </p>
                      <p className="text-muted-foreground line-clamp-2 text-[10px]">
                        {s.summaryLine ?? s.id.slice(0, 8)}
                      </p>
                      <p className="text-muted-foreground text-[10px]">
                        {format(new Date(s.createdAt), "PPp")}
                      </p>
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-full text-xs"
                          disabled={restoreSnapshot.isPending}
                          onClick={() =>
                            restoreSnapshot.mutate({
                              projectId,
                              snapshotId: s.id,
                            })
                          }
                        >
                          Restore here
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 w-full text-xs"
                          disabled={duplicateFromSnapshot.isPending}
                          onClick={() =>
                            duplicateFromSnapshot.mutate({
                              sourceProjectId: projectId,
                              snapshotId: s.id,
                            })
                          }
                        >
                          <CopyIcon className="mr-1 size-3" />
                          Remix new project
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>

          <TabsContent value="export" className="flex flex-col gap-4">
            <div className="text-muted-foreground flex gap-2 text-sm">
              <PackageIcon className="size-4 shrink-0" />
              Download all generated files as a ZIP (Next.js app tree from the
              sandbox).
            </div>
            {historyItems.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="export-run">Build</Label>
                <select
                  id="export-run"
                  className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                  value={exportRunId || defaultRunId}
                  onChange={(e) => setExportRunId(e.target.value)}
                >
                  {historyItems.map((h) => (
                    <option key={h.runId} value={h.runId}>
                      {h.fragment.title} —{" "}
                      {h.finishedAt
                        ? format(new Date(h.finishedAt), "P")
                        : h.runId.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <Button
              onClick={() => void handleDownloadZip()}
              disabled={exporting || historyItems.length === 0}
            >
              {exporting ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <PackageIcon className="size-4" />
              )}
              Download .zip
            </Button>
          </TabsContent>

          <TabsContent value="github" className="flex flex-col gap-3">
            <div className="bg-muted/50 space-y-2 rounded-lg border p-3 text-xs">
              {ghLoading ? (
                <p className="text-muted-foreground flex items-center gap-2">
                  <Loader2Icon className="size-3.5 animate-spin" />
                  Checking GitHub…
                </p>
              ) : ghConnected ? (
                <div className="space-y-2">
                  <p>
                    Connected as{" "}
                    <strong>{ghIntegration?.githubLogin ?? "GitHub"}</strong>. Push
                    uses your stored OAuth token (encrypted on the server).
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={disconnectGh.isPending}
                    onClick={() => disconnectGh.mutate()}
                  >
                    Disconnect GitHub
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    Connect GitHub (OAuth) to push without pasting a PAT. Requires{" "}
                    <code className="text-foreground">GITHUB_CLIENT_*</code> and a
                    32+ char{" "}
                    <code className="text-foreground">INTEGRATION_ENCRYPTION_KEY</code>{" "}
                    on the server.
                  </p>
                  <Button type="button" variant="secondary" className="w-full" asChild>
                    <Link href={connectHref}>Connect GitHub</Link>
                  </Button>
                </div>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              Or use a one-time{" "}
              <a
                className="text-primary underline"
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noreferrer"
              >
                personal access token
              </a>{" "}
              (<strong>contents: write</strong>). The PAT is only sent for this
              request and is not stored. Create an{" "}
              <strong>empty repo</strong> with an initial commit on your branch
              first.
            </p>
            {historyItems.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="gh-run">Build to push</Label>
                <select
                  id="gh-run"
                  className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                  value={githubRunId || defaultRunId}
                  onChange={(e) => setGithubRunId(e.target.value)}
                >
                  {historyItems.map((h) => (
                    <option key={h.runId} value={h.runId}>
                      {h.fragment.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="gh-owner">Owner</Label>
              <Input
                id="gh-owner"
                placeholder="octocat"
                value={githubOwner}
                onChange={(e) => setGithubOwner(e.target.value.trim())}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gh-repo">Repository</Label>
              <Input
                id="gh-repo"
                placeholder="my-app"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value.trim())}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gh-branch">Branch</Label>
              <Input
                id="gh-branch"
                value={githubBranch}
                onChange={(e) => setGithubBranch(e.target.value.trim())}
                autoComplete="off"
              />
            </div>
            {!ghConnected ? (
              <div className="space-y-2">
                <Label htmlFor="gh-token">Token (optional if connected via OAuth)</Label>
                <Input
                  id="gh-token"
                  type="password"
                  placeholder="ghp_…"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  autoComplete="off"
                />
              </div>
            ) : null}
            <Button
              disabled={
                pushGithub.isPending ||
                !githubOwner ||
                !githubRepo ||
                (!ghConnected && !githubToken) ||
                !(githubRunId || defaultRunId)
              }
              onClick={() => {
                const runId = githubRunId || defaultRunId;
                if (!runId) return;
                pushGithub.mutate({
                  projectId,
                  runId,
                  owner: githubOwner,
                  repo: githubRepo,
                  branch: githubBranch || "main",
                  ...(githubToken ? { token: githubToken } : {}),
                });
              }}
            >
              {pushGithub.isPending ? (
                <Loader2Icon className="animate-spin" />
              ) : null}
              Push one commit
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              disabled={
                shipAll.isPending ||
                !githubOwner ||
                !githubRepo ||
                (!ghConnected && !githubToken) ||
                !(githubRunId || defaultRunId)
              }
              onClick={() => {
                const runId = githubRunId || defaultRunId;
                if (!runId) return;
                shipAll.mutate({
                  projectId,
                  runId,
                  owner: githubOwner,
                  repo: githubRepo,
                  branch: githubBranch || "main",
                  ...(githubToken ? { token: githubToken } : {}),
                });
              }}
            >
              {shipAll.isPending ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <RocketIcon className="size-4" />
              )}
              Push + Vercel deploy hook
            </Button>
          </TabsContent>
        </Tabs>

        <div className="border-t pt-4">
          <p className="text-muted-foreground mb-2 text-sm font-medium">
            Deploy (Vercel)
          </p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            After the repo is on GitHub, import it at{" "}
            <a
              className="text-primary inline-flex items-center gap-1 underline"
              href="https://vercel.com/new"
              target="_blank"
              rel="noreferrer"
            >
              vercel.com/new
              <ExternalLinkIcon className="size-3" />
            </a>
            . Set the framework to <strong>Next.js</strong>, root directory if
            needed, then add the same env vars you use locally (Clerk, DB, etc.).
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-3 w-full"
            disabled={triggerDeploy.isPending}
            onClick={() => triggerDeploy.mutate()}
          >
            {triggerDeploy.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <RocketIcon className="size-4" />
            )}
            Trigger deploy hook
          </Button>
          <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
            Set <code>VERCEL_DEPLOY_HOOK_URL</code> in the server env (Vercel →
            Project → Settings → Git → Deploy Hooks).
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
