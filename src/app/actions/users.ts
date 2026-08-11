"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { verifySession } from "@/lib/auth/dal";

const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  title: z.string().trim().optional(),
});

export type CreateUserState =
  | { error: string }
  | { success: true; email: string; password: string }
  | undefined;

export async function createUser(
  _prevState: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  await verifySession();

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    title: formData.get("title"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: "A user with that email already exists." };
  }

  const password = randomBytes(9).toString("base64url");
  await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      title: parsed.data.title || null,
      passwordHash: await hashPassword(password),
    },
  });

  revalidatePath("/settings");
  return { success: true, email: parsed.data.email, password };
}

export async function deleteUser(userId: string) {
  const session = await verifySession();
  if (session.userId === userId) {
    throw new Error("You can't delete your own account while logged in.");
  }
  const count = await db.user.count();
  if (count <= 1) {
    throw new Error("Can't delete the last remaining user.");
  }
  await db.user.delete({ where: { id: userId } });
  revalidatePath("/settings");
}
