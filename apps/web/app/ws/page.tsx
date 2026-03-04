import { useAuth } from "@clerk/nextjs"

const { getToken } = useAuth()

async function connectWS() {
  const token = await getToken()

  const ws = new WebSocket(`ws://localhost:8080?token=${token}`)
}