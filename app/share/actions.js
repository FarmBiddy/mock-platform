"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MAX_SHARES, SHARED_COOKIE, cleanShare, readShares } from "@/lib/shared";
import { ADVISOR, CLIENT_COOKIE, OWNER_FARM, getViewer } from "@/lib/session";

const OPTS = { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 };
const save = async (shares) => (await cookies()).set(SHARED_COOKIE, JSON.stringify(shares), OPTS);

/** The owner sends a prepared view of the farm to their advisor (after confirming on /share). */
export async function shareWithAdvisor(formData) {
  if ((await getViewer()).role !== "owner") redirect("/portfolio");
  const share = cleanShare({
    id: crypto.randomUUID().slice(0, 8),
    farm: OWNER_FARM,
    title: formData.get("title"),
    summary: formData.get("summary"),
    note: formData.get("note"),
    href: formData.get("href"),
    at: new Date().toISOString(),
  });
  if (!share) redirect("/share?error=1");
  await save([share, ...(await readShares())].slice(0, MAX_SHARES));
  redirect("/share?sent=1");
}

/** The advisor opens a shared scenario: switch to that client and go to the page it was shared from. */
export async function openShare(formData) {
  const share = (await readShares()).find((s) => s.id === formData.get("id"));
  if (!share || !ADVISOR.clients.includes(share.farm)) redirect("/portfolio");
  (await cookies()).set(CLIENT_COOKIE, share.farm, OPTS);
  redirect(share.href);
}

export async function dismissShare(formData) {
  await save((await readShares()).filter((s) => s.id !== formData.get("id")));
}
