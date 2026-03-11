import "dotenv/config";
import { WebSocket, WebSocketServer } from 'ws';
import { prisma } from "@repo/db";
import { verifyToken } from "@clerk/backend";
const wss = new WebSocketServer({ port: 8080 });

interface User {
  ws: WebSocket,
  rooms: number[],
  userId: string
}

interface QueuedChatBroadcast {
  id: number,
  roomId: number,
  message: string,
  authorId: string,
  createdAt: string
}

const users: User[] = [];
const broadcastQueue: QueuedChatBroadcast[] = [];
let isFlushingBroadcastQueue = false;

function removeUser(ws: WebSocket) {
  const index = users.findIndex((user) => user.ws === ws);

  if (index !== -1) {
    users.splice(index, 1);
  }
}

function sendError(ws: WebSocket, message: string) {
  if (ws.readyState !== WebSocket.OPEN) {
    return;
  }

  ws.send(JSON.stringify({
    type: "error",
    message,
  }));
}

async function sendJson(ws: WebSocket, payload: unknown) {
  if (ws.readyState !== WebSocket.OPEN) {
    removeUser(ws);
    return;
  }

  await new Promise<void>((resolve) => {
    ws.send(JSON.stringify(payload), (error) => {
      if (error) {
        console.log("Failed to send websocket message");
        console.log(error);
        removeUser(ws);
      }

      resolve();
    });
  });
}

async function flushBroadcastQueue() {
  if (isFlushingBroadcastQueue) {
    return;
  }

  isFlushingBroadcastQueue = true;

  try {
    while (broadcastQueue.length > 0) {
      const chat = broadcastQueue.shift();

      if (!chat) {
        continue;
      }

      const recipients = users.filter((user) => user.rooms.includes(chat.roomId));

      await Promise.all(
        recipients.map((user) =>
          sendJson(user.ws, {
            type: "chat",
            id: chat.id,
            message: chat.message,
            roomId: chat.roomId,
            authorId: chat.authorId,
            createdAt: chat.createdAt,
          }),
        ),
      );
    }
  } finally {
    isFlushingBroadcastQueue = false;

    if (broadcastQueue.length > 0) {
      void flushBroadcastQueue();
    }
  }
}

function enqueueChatBroadcast(chat: QueuedChatBroadcast) {
  broadcastQueue.push(chat);
  void flushBroadcastQueue();
}

function parseRoomId(value: unknown) {
  const roomId = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(roomId) || roomId <= 0) {
    return null;
  }

  return roomId;
}
wss.on('connection', async function connection(ws,request) {
  try{
  
  // const url = request.url
  
  // const queryParams = new URLSearchParams(url?.split('?')[1])
  // const token = queryParams.get("token")
  // const payload = await verifyToken(token!,{
  //     secretKey: process.env.CLERK_SECRET_KEY,
  //   })
  // const userId  = payload.sub
  const userId = "user_3AUjlHnQ1pFtm1pXmln7f4Snlew"
   users.push({
    userId,
    rooms:[],
    ws
  })

  ws.on("close", () => {
    removeUser(ws);
  });

  ws.on("error", (error) => {
    console.log("WebSocket error");
    console.log(error);
    removeUser(ws);
  });
  
    
  ws.on('message', async function message(data) {
    try{
      const parsedData = JSON.parse(data as unknown as string)
      if(parsedData.type == "join_room"){
        const roomId = parseRoomId(parsedData.roomId)
        if (!roomId) {
          sendError(ws, "Invalid roomId")
          return
        }

        const room = await prisma.room.findUnique({
          where: {
            id: roomId
          },
          select: {
            id: true
          }
        })

        if (!room) {
          sendError(ws, "Room not found")
          return
        }
        const user = users.find(x=>x.ws === ws)
        if (user && !user.rooms.includes(roomId)) {
          user.rooms.push(roomId)
        }

        
      }
      

      if(parsedData.type == "leave_room"){
        const roomId = parseRoomId(parsedData.roomId)
        if (!roomId) {
          sendError(ws, "Invalid roomId")
          return
        }

        const user = users.find(x=>x.ws === ws)
        if(!user){
          ws.close()
          return
        }
        user.rooms = user.rooms.filter(x=> x !== roomId)
      }
      if(parsedData.type == "chat"){
        const roomId = parseRoomId(parsedData.roomId)
        if (!roomId) {
          sendError(ws, "Invalid roomId")
          return
        }
        const message =
          typeof parsedData.message === "string" ? parsedData.message.trim() : "";

        if (!message) {
          sendError(ws, "Message is required")
          return
        }

        const room = await prisma.room.findUnique({
          where: {
            id: roomId
          },
          select: {
            id: true
          }
        })

        if (!room) {
          sendError(ws, "Room not found")
          return
        }
        
        const chat = await prisma.chat.create({
          data:{
            message: message, 
            authorId: userId,
            roomId: roomId
          },
          select: {
            id: true,
            message: true,
            roomId: true,
            authorId: true,
            createdAt: true
          },
        })

        enqueueChatBroadcast({
          id: chat.id,
          message: chat.message,
          roomId: chat.roomId,
          authorId: chat.authorId,
          createdAt: chat.createdAt.toISOString(),
        })

        
      }
    }
    catch(e){
      console.log("Internal Error")
      console.log(e)
      sendError(ws, "Internal Error")


    }
  });
  
}catch(e){
  console.log("Invalid token")
    ws.close()
}
  
});
