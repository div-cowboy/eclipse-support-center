"use server";

import { signIn } from "@/app/auth";

export async function signInAction(formData: FormData) {
  await signIn("resend", formData);
}

