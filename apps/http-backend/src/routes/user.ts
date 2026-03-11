// import { verifyToken } from "@clerk/backend"
// import express, { Router } from "express";
// import { z, ZodError } from "zod";
// import cors from "cors"
// import Cookies from "cookies";

// const app: Router = express.Router()
// app.use(cors());
// const userSchema = z.object({
//   username: z
//     .string("Invalid username")
//     .min(4, "Username must be at least 4 characters"),

//   password: z
//     .string("Invalid password")
//     .min(6, "Password must be at least 6 characters").regex(/[A-Z]/, "Must contain at least one uppercase letter"),

//   email: z
//     .email("Invalid email address"),
// });

// function formatZodErrors(error: ZodError) {
//   const issues = error.issues
//   return issues.map(issue => ({
//     field: issue.path[0],
//     message: issue.message,
//   }));
// }
// app.post("/signup", (req, res) => {
//   try{
//   const result = userSchema.safeParse(req.body)
//   if (result.success) {
//     const { username, email, password } = result.data

//     // console.log(result)
//   }


//   if (!result.success) {
//     // console.log(result.error)
//     return res.status(400).json({
//       errors: formatZodErrors(result.error),
//     });
//   }
//   else{

//     return res.json({
//       message:"you signedup successfully"
//     })
//   }}
//   catch(e){
//     // console.log(e)
//     return res.status(500).json({
//       message: "Internal Error"
//     })
//   }


// })
// app.post("/signin",async (req,res)=>{
// try{
//   // console.log("jkljkjlkjl") 

//  const cookies = new Cookies(req, res);
//  const tokenSameOrigin = cookies.get("__session");
//  const tokenCrossOrigin = req.headers.authorization?.replace("Bearer ", "");
 
//  const token = tokenSameOrigin || tokenCrossOrigin;
 
// console.log(token)
 
//  const payload = await verifyToken(token!,{
//       secretKey: process.env.CLERK_SECRET_KEY, 
//       apiUrl: 'https://api.clerk.com',
//     })
//   // console.log("User authenticated:", payload.sub)
  
// res.status(200).json({
//   data:payload.sub
// })

// }catch(e){
//   // console.log("ssss",e)
//   res.status(500).json({
//     message: "Internal Error",
//     error: e
//   })
// }
// })



// export default app