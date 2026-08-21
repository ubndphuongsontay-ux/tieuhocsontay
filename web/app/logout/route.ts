import { clearSessionCookie } from "@/lib/auth/session";
import { redirect } from "next/navigation";

async function logout() {
  await clearSessionCookie();
  redirect("/login");
}

export async function GET() {
  return logout();
}

export async function POST() {
  return logout();
}
