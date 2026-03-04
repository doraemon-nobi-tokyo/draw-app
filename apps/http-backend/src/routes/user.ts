import express, { Router } from "express";
import { z, ZodError } from "zod";

const app: Router = express.Router()
const userSchema = z.object({
  username: z
    .string("Invalid username")
    .min(4, "Username must be at least 4 characters"),

  password: z
    .string("Invalid password")
    .min(6, "Password must be at least 6 characters").regex(/[A-Z]/, "Must contain at least one uppercase letter"),

  email: z
    .email("Invalid email address"),
});

function formatZodErrors(error: ZodError) {
  const issues = error.issues
  return issues.map(issue => ({
    field: issue.path[0],
    message: issue.message,
  }));
}
app.post("/signup", (req, res) => {
  try{
  const result = userSchema.safeParse(req.body)
  if (result.success) {
    const { username, email, password } = result.data

    console.log(result)
  }


  if (!result.success) {
    console.log(result.error)
    return res.status(400).json({
      errors: formatZodErrors(result.error),
    });
  }
  else{

    return res.json({
      message:"you signedup successfully"
    })
  }}
  catch(e){
    console.log(e)
    return res.status(500).json({
      message: "Internal Error"
    })
  }


})
app.post("/signin",(req,res)=>{
try{

}catch(e){
  res.status(500).json({
    message: "Internal Error"
  })
}
})



export default app