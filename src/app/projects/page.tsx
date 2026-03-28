import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ProjectsList } from "@/modules/home/ui/components/projects-list";
import { Navbar } from "@/modules/home/ui/components/navbar";

export default async function ProjectsIndexPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <main className="flex min-h-screen flex-col">
      <Navbar />
      <div className="absolute inset-0 -z-10 h-full w-full bg-background dark:bg-[radial-gradient(#393e4a_1px,transparent_1px)] bg-[radial-gradient(#dadde2_1px,transparent_1px)] [background-size:16px_16px]" />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-12 pt-24">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              All projects
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Open a project, remix from the dashboard or Ship → snapshots.
            </p>
          </div>
          <Button asChild>
            <Link href="/">New project</Link>
          </Button>
        </div>
        <ProjectsList showHeading={false} />
      </div>
    </main>
  );
}
