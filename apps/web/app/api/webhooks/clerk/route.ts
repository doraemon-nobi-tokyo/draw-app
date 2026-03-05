import type { WebhookEvent } from "@clerk/nextjs/server";
import { prisma } from "@repo/db";
import { NextResponse } from "next/server";
import { Webhook } from "svix";

type UserChangedEvent = Extract<WebhookEvent, { type: "user.created" | "user.updated" }>;
type UserDeletedEvent = Extract<WebhookEvent, { type: "user.deleted" }>;

function getPrimaryEmail(data: UserChangedEvent["data"]): string | null {
  const primaryEmail = data.email_addresses.find(
    (emailAddress) => emailAddress.id === data.primary_email_address_id,
  );

  return primaryEmail?.email_address ?? data.email_addresses[0]?.email_address ?? null;
}

function getName(data: UserChangedEvent["data"], email: string | null): string {
  const firstName = data.first_name?.trim() ?? "";
  const lastName = data.last_name?.trim() ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  if (fullName) {
    return fullName;
  }

  const username = data.username?.trim();
  if (username) {
    return username;
  }

  if (email) {
    return email.split("@")[0] ?? data.id;
  }

  return data.id;
}

function getUsername(data: UserChangedEvent["data"]): string {
  return data.username?.trim() || data.id;
}

export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("Missing WEBHOOK_SECRET");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const body = await req.text();
    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing Svix headers", { status: 400 });
    }

    const wh = new Webhook(webhookSecret);
    const event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;

    if (event.type === "user.deleted") {
      const deletedEvent = event as UserDeletedEvent;
      await prisma.user.deleteMany({ where: { id: deletedEvent.data.id } });
      return new Response("User deleted", { status: 200 });
    }

    if (event.type !== "user.created" && event.type !== "user.updated") {
      return new Response("Event ignored", { status: 200 });
    }

    const userEvent = event as UserChangedEvent;
    const primaryEmail = getPrimaryEmail(userEvent.data);
    const name = getName(userEvent.data, primaryEmail);
    const firstname = userEvent.data.first_name?.trim() ?? "";
    const lastname = userEvent.data.last_name?.trim() ?? "";
    const username = getUsername(userEvent.data);

    const existingUser = await prisma.user.findUnique({
      where: { id: userEvent.data.id },
      select: { id: true },
    });

    if (existingUser) {
      await prisma.user.update({
        where: { id: userEvent.data.id },
        data: {
          ...(primaryEmail ? { email: primaryEmail } : {}),
          name,
          firstname,
          lastname,
          username,
          photo: userEvent.data.image_url ?? null,
        },
      });

      return new Response("User synced", { status: 200 });
    }

    if (!primaryEmail) {
      return new Response("Primary email missing", { status: 400 });
    }

    await prisma.user.create({
      data: {
        id: userEvent.data.id,
        email: primaryEmail,
        name,
        firstname,
        lastname,
        username,
        photo: userEvent.data.image_url ?? null,
      },
    });

    return new Response("User synced", { status: 200 });
  } catch (err) {
    console.error("Clerk webhook error:", err);
    return NextResponse.json({
      errorType:"Webhook error",
      error: err
    }, { status: 400});
  }
}
