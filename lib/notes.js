import { cookies } from "next/headers";
import { ADVISOR } from "@/lib/session";

/**
 * The advisor's private notes per client (the farmer never sees them).
 * ponytail: one cookie for all clients, 500 chars each; move to the platform DB with real accounts.
 */
export const NOTES_COOKIE = "fb_notes";
export const NOTE_MAX = 500;

/** { farmId: note } for the advisor's clients only (cookie input is untrusted). */
export async function readNotes() {
  try {
    const raw = JSON.parse((await cookies()).get(NOTES_COOKIE)?.value ?? "{}");
    return Object.fromEntries(
      ADVISOR.clients.filter((id) => typeof raw[id] === "string" && raw[id].trim()).map((id) => [id, raw[id].slice(0, NOTE_MAX)]),
    );
  } catch {
    return {};
  }
}
