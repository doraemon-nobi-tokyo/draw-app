import { auth } from '@clerk/nextjs/server'
import { prisma } from '@repo/db'

export async function GET() {
  const { userId, sessionId } = await auth()
  
  if (!userId) {
    return Response.json({message:'Unauthorized'}, { status: 401 })
  }
  
  // User is authenticated, process the request


  return Response.json({ message: `Hello ${userId}` })
} 
