import { WebSocketServer } from 'ws';
import { verifyToken } from "@clerk/backend"
const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', async function connection(ws,request) {
  try{
  
  const url = request.url
  
  const queryParams = new URLSearchParams(url?.split('?')[1])
  const token = queryParams.get("token")
  const payload = await verifyToken(token!,{
      secretKey: process.env.CLERK_SECRET_KEY,
    })
  console.log("User authenticated:", payload.sub)
  
    
  ws.on('message', function message(data) {

    ws.send('pong');
  });
}catch(e){
  console.log("Invalid token")
    ws.close()
}
  
});