"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { CopyIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";

interface ProjectsListProps {
  /** When false, hide the “{name}'s Projects” heading (e.g. dedicated /projects page). */
  showHeading?: boolean;
}

const ProjectsList = ({ showHeading = true }: ProjectsListProps) => {
  const { user } = useUser();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: projects } = useQuery(trpc.projects.getMany.queryOptions());

  const duplicate = useMutation(
    trpc.projects.duplicate.mutationOptions({
      onSuccess: (data) => {
        void queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
        toast.success("Remix created — opening project…");
        router.push(`/projects/${data.id}`);
      },
      onError: (err) => {
        toast.error(err.message || "Could not duplicate project.");
      },
    }),
  );

  return (
    <div className="w-full bg-white dark:bg-sidebar rounded-xl p-8 border flex flex-col gap-y-6 sm:gap-y-4">
      {showHeading ? (
        <h2 className="text-2xl font-semibold">
          {user?.firstName ? `${user.firstName}'s projects` : "Your projects"}
        </h2>
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {projects?.length === 0 && (
          <div className="col-span-full text-center">
            <p className="text-sm text-muted-foreground">No projects found</p>
          </div>
        )}
        {projects?.map((project) => (
          <div
            key={project.id}
            className="group relative rounded-xl border bg-background transition-shadow hover:shadow-sm"
          >
            <Link
              href={`/projects/${project.id}`}
              className="flex items-center gap-x-4 p-4 pr-14"
            >
              <Image
                src="/logo.svg"
                alt="lovable-clone"
                width={32}
                height={32}
                className="object-contain"
              />
              <div className="min-w-0 flex flex-col">
                <h3 className="truncate font-medium">{project.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(project.updatedAt, {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </Link>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 size-9 -translate-y-1/2 opacity-80 hover:opacity-100"
              title="Remix project"
              disabled={duplicate.isPending}
              onClick={(e) => {
                e.preventDefault();
                duplicate.mutate({ sourceProjectId: project.id });
              }}
            >
              <CopyIcon className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export { ProjectsList };
