"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Building2Icon, Loader2Icon, UsersIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTRPC } from "@/trpc/client";

export function WorkspaceSettingsCard() {
  const trpc = useTRPC();
  const { data, isLoading, isError } = useQuery(trpc.workspace.getMine.queryOptions());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2Icon className="size-5" />
          Workspace
        </CardTitle>
        <CardDescription>
          Projects you create belong to this workspace. Member invites can be
          wired to Clerk organizations in a later iteration.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm">
        {isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2">
            <Loader2Icon className="size-4 animate-spin" />
            Loading workspace…
          </div>
        ) : isError || !data ? (
          <p className="text-muted-foreground">
            Could not load workspace. Try refreshing the page.
          </p>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Name
              </dt>
              <dd className="mt-0.5 font-medium">{data.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Your role
              </dt>
              <dd className="mt-0.5 font-medium">{data.role}</dd>
            </div>
            <div className="flex items-center gap-2">
              <UsersIcon className="text-muted-foreground size-4" />
              <span>
                <span className="font-medium tabular-nums">{data.memberCount}</span>{" "}
                member{data.memberCount === 1 ? "" : "s"}
              </span>
            </div>
            <div>
              <span className="font-medium tabular-nums">{data.projectCount}</span>{" "}
              project{data.projectCount === 1 ? "" : "s"}
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Created
              </dt>
              <dd className="mt-0.5 text-muted-foreground">
                {format(data.createdAt, "PPP")}
              </dd>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
