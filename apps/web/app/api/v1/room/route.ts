import { auth } from "@clerk/nextjs/server";
import { prisma } from "@repo/db";

type RoomWhereUniqueInput = { id: number } | { slug: string };

async function getUserId() {
  const { userId } = await auth();
  return userId;
}

function getRoomIdentifier(request: Request): { where?: RoomWhereUniqueInput; error?: string } {
  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get("id");
  const slugParam = searchParams.get("slug");

  if (idParam && slugParam) {
    return { error: "Provide either id or slug, not both." };
  }

  if (idParam) {
    const parsedId = Number(idParam);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return { error: "id must be a positive integer." };
    }

    return { where: { id: parsedId } };
  }

  if (slugParam) {
    const slug = slugParam.trim();
    if (!slug) {
      return { error: "slug cannot be empty." };
    }

    return { where: { slug } };
  }

  return {};
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { where, error } = getRoomIdentifier(request);
  if (error) {
    return Response.json({ message: error }, { status: 400 });
  }

  if (!where) {
    const rooms = await prisma.room.findMany({
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ rooms }, { status: 200 });
  }

  const room = await prisma.room.findUnique({ where });
  if (!room) {
    return Response.json({ message: "Room not found" }, { status: 404 });
  }

  return Response.json({ room }, { status: 200 });
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const slugValue =
    typeof body === "object" && body !== null && "slug" in body
      ? (body as { slug?: unknown }).slug
      : undefined;

  if (typeof slugValue !== "string" || !slugValue.trim()) {
    return Response.json({ message: "slug is required" }, { status: 400 });
  }

  const slug = slugValue.trim();

  try {
    const room = await prisma.room.create({
      data: {
        slug,
        adminId: userId,
      },
    });

    return Response.json({ room }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return Response.json({ message: "Room slug already exists" }, { status: 409 });
    }

    console.error("Room create error:", error);
    return Response.json({ message: "Failed to create room" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { where, error } = getRoomIdentifier(request);
  if (error) {
    return Response.json({ message: error }, { status: 400 });
  }

  if (!where) {
    return Response.json({ message: "id or slug is required" }, { status: 400 });
  }

  const room = await prisma.room.findUnique({ where });
  if (!room) {
    return Response.json({ message: "Room not found" }, { status: 404 });
  }

  if (room.adminId !== userId) {
    return Response.json({ message: "Only room owner can delete this room" }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.chat.deleteMany({ where: { roomId: room.id } }),
    prisma.room.delete({ where: { id: room.id } }),
  ]);

  return Response.json({ message: "Room deleted", roomId: room.id }, { status: 200 });
}
