import { Inngest } from "inngest";
import { env } from "@/config/env";

// Create a client to send and receive events
export const inngest = new Inngest({
  id: "lovable-clone",
  eventKey: env.INNGEST_EVENT_KEY,
  signingKey: env.INNGEST_SIGNING_KEY,
  isDev: env.INNGEST_DEV === "1",
});
