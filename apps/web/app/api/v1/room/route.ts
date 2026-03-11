import {CreateRoomSchema} from "@repo/common/src"
import { prisma } from "@repo/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

async function getUserId() {
  const { userId } = await auth();
  return userId;
}

export async function POST(req:Request) {
  const userId = await getUserId();
  if (!userId) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return Response.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const parsedData = CreateRoomSchema.safeParse(body);
  
  if (!parsedData.success) {
      return  NextResponse.json({
          message: "Incorrect inputs"
      })
  }

  try {
      const room = await prisma.room.create({
          data: {
              slug: parsedData.data.name,
              adminId: userId
          }
      })

      return NextResponse.json({
          roomId: room.id},
        { status: 201 })
  } catch(e) {
    console.error("Room create error:", e);

      return NextResponse.json({
          message: "Room already exists with this name"
      },{status:409})
  }
}