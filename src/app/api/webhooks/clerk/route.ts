import { headers } from "next/headers";
import { Webhook } from "svix";

import { env } from "@/config/env";
import prisma from "@/lib/prisma";
import {
  syncClerkUserFromWebhook,
  type ClerkWebhookUser,
} from "@/lib/user-sync";

type ClerkEvent = {
  type: string;
  data: { id: string; [key: string]: unknown };
};

export async function POST(req: Request) {
  const secret = env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("CLERK_WEBHOOK_SECRET is not set", { status: 503 });
  }

  const h = await headers();
  const svixId = h.get("svix-id");
  const svixTimestamp = h.get("svix-timestamp");
  const svixSignature = h.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  const rawBody = await req.text();
  const wh = new Webhook(secret);

  let evt: ClerkEvent;
  try {
    evt = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkEvent;
  } catch {
    return new Response("Invalid webhook signature", { status: 400 });
  }

  try {
    if (evt.type === "user.created" || evt.type === "user.updated") {
      await syncClerkUserFromWebhook(evt.data as ClerkWebhookUser);
    } else if (evt.type === "user.deleted") {
      await prisma.user.deleteMany({
        where: { clerkId: evt.data.id },
      });
    }
  } catch {
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response(null, { status: 200 });
}
