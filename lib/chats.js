import { useSyncExternalStore } from "react";

/**
 * Chat history, kept by the platform (Biddy's agents are stateless).
 * Mock storage: this browser's localStorage, with an in-memory fallback.
 * ponytail: per-browser only; move to the platform DB when chats must follow the user across devices.
 *
 * @typedef {{ id: string, role: "user" | "biddy", text: string, status?: string, agent?: string | null,
 *   results?: object[], follow_ups?: string[], missing?: object[], unverified?: object[] }} ChatMessage
 * @typedef {{ id: string, title: string, createdAt: string, messages: ChatMessage[] }} Chat
 */

const KEY = "fb:chats";
const EMPTY = [];
const listeners = new Set();
let cache = EMPTY;
let raw = null;

function read() {
  try {
    const r = localStorage.getItem(KEY);
    if (r !== raw) {
      raw = r;
      cache = r ? JSON.parse(r) : EMPTY;
    }
  } catch {
    // storage blocked or corrupt: keep what we have in memory
  }
  return cache;
}

function subscribe(cb) {
  listeners.add(cb);
  const onStorage = (e) => e.key === KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** All chats, newest first. */
export const useChats = () => useSyncExternalStore(subscribe, read, () => EMPTY);

export const getChat = (id) => read().find((c) => c.id === id);

/** Insert or replace a chat and move it to the top. */
export function saveChat(chat) {
  cache = [chat, ...read().filter((c) => c.id !== chat.id)];
  try {
    const next = JSON.stringify(cache);
    localStorage.setItem(KEY, next);
    raw = next; // only after a successful write, so read() doesn't reload the stale copy
  } catch {
    // quota / private mode: chat lives in memory for this session
  }
  listeners.forEach((l) => l());
}

export const newId = () => crypto.randomUUID().slice(0, 8);
