import Link from "next/link";

import { WorkspaceSettingsCard } from "@/modules/home/ui/components/workspace-settings-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-24">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Settings
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Profile and sessions are managed through the user menu (top right).
        </p>
      </div>

      <WorkspaceSettingsCard />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Open your account panel to update profile, security, and connected
            accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/billing">Usage &amp; plan</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/pricing">Pricing</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
