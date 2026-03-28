import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  CopyIcon,
  RocketIcon,
  SunMoonIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ProjectHeaderProps {
  projectId: string;
  onOpenShip?: () => void;
}

const ProjectHeader = ({ projectId, onOpenShip }: ProjectHeaderProps) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: project } = useQuery(
    trpc.projects.getOne.queryOptions({ id: projectId })
  );

  const duplicate = useMutation(
    trpc.projects.duplicate.mutationOptions({
      onSuccess: (data) => {
        void queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
        toast.success("Remix created — opening…");
        router.push(`/projects/${data.id}`);
      },
      onError: (err) => {
        toast.error(err.message || "Could not duplicate project.");
      },
    }),
  );

  const { setTheme, theme } = useTheme();

  return (
    <header className="p-2 flex justify-between items-center border-b gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="focus-visible:ring-0 hover:bg-transparent hover:opacity-75 transition-opacity pl-2!"
          >
            <Image src="/logo.svg" alt="lovable-clone" height={18} width={18} />
            <span className="text-sm font-medium">{project?.name}</span>
            <ChevronDownIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="start">
          <DropdownMenuItem asChild>
            <Link href="/projects">
              <ChevronLeftIcon />
              <span>All projects</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={duplicate.isPending}
            onSelect={() => {
              duplicate.mutate({ sourceProjectId: projectId });
            }}
          >
            <CopyIcon />
            <span>Remix project</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2">
              <SunMoonIcon className="size-4 text-muted-foreground" />
              <span>Appearance</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                  <DropdownMenuRadioItem value="light">
                    <span>Light</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    <span>Dark</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">
                    <span>System</span>
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
      {onOpenShip ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="ml-auto shrink-0 gap-1.5"
          onClick={onOpenShip}
        >
          <RocketIcon className="size-4" />
          Ship
        </Button>
      ) : null}
    </header>
  );
};

export { ProjectHeader };
