import { z } from "zod";
export const CreateRoomSchema = z.object({
    name: z.string().min(3).max(20),
})