"use client";

/** Submits resetDemo after clearing what the browser keeps (chats, the sources toggle). */
export default function ResetDemoButton() {
  function clearBrowserState() {
    try {
      localStorage.removeItem("fb:chats");
      localStorage.removeItem("fb:show-sources");
    } catch {}
    document.documentElement.removeAttribute("data-sources");
  }
  return (
    <button onClick={clearBrowserState} className="w-full rounded-lg px-3 py-2 text-left text-xs text-stone-600 hover:bg-stone-100">
      ↺ Reset demo <span className="text-stone-400">· clears edits, shares, notes and chats</span>
    </button>
  );
}
