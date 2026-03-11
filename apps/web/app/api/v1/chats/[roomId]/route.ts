import { NextResponse } from "next/server";
import { prisma } from "@repo/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;
  const parsedRoomId = Number(roomId);

  if (!Number.isInteger(parsedRoomId) || parsedRoomId <= 0) {
    return NextResponse.json({ message: "Invalid roomId" }, { status: 400 });
  }

  const chats = await prisma.chat.findMany({
    where: {
      roomId: parsedRoomId,
    },
    select: {
      message: true,
      updatedAt: true,
      author: {
        select: {
          firstname: true,
          username:true
        },
      },
    },
    take:50,
    orderBy: {
      id: "desc",
    },

  });

  return NextResponse.json(
    chats.map((chat) => ({
      message: chat.message,
      updatedAt: chat.updatedAt,
      firstName: chat.author.firstname,
      userName: chat.author.username,
    })),
  );
}
