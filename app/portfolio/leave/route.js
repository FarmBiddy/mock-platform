import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CLIENT_COOKIE } from "@/lib/session";

/** Being on the portfolio means no client is open (cookies can't change while a page renders). */
export async function GET() {
  (await cookies()).delete(CLIENT_COOKIE);
  redirect("/portfolio");
}
