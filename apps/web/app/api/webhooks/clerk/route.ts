import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import {prisma} from "@repo/db";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headers = req.headers;

    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);

    const event = wh.verify(body, {
      "svix-id": headers.get("svix-id")!,
      "svix-timestamp": headers.get("svix-timestamp")!,
      "svix-signature": headers.get("svix-signature")!,
    }) as WebhookEvent;

    // ✅ Only handle user.created
    if (event.type !== "user.created") {
      return new Response("Event ignored", { status: 200 });
    }

    // 🔹 Get primary email safely
    const emailObj = event.data.email_addresses.find(
      (e) => e.id === event.data.primary_email_address_id
    );

    if (!emailObj) {
      return new Response("Primary email missing", { status: 400 });
    }

    // 🔹 Ensure required fields exist (Type narrowing)
    if (!event.data.first_name) {
      return new Response("First name missing", { status: 400 });
    }

    if (!event.data.username) {
      return new Response("Username missing", { status: 400 });
    }

    const email = emailObj.email_address;
    const name = event.data.first_name;
    const username = event.data.username;

    // ✅ Idempotent (safe if webhook fires twice)
    await prisma.user.upsert({
      where: { id: event.data.id },
      update: {},
      create: {
        id: event.data.id,        // Clerk ID
        email,
        name,
        username,
        photo: event.data.image_url ?? null,
      },
    });

    return new Response("User synced", { status: 200 });

  } catch (err) {
    console.error("Clerk webhook error:", err);
    return new Response("Webhook error", { status: 400 });
  }
}


