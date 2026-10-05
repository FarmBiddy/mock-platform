"use client";

import { useEffect, useRef } from "react";

const KEY = "fb:show-sources";

function apply(on) {
  document.documentElement.toggleAttribute("data-sources", on);
}

/** Shows/hides engine & platform source badges (per-viewer preference). */
export default function SourcesToggle() {
  const box = useRef(null);

  useEffect(() => {
    let on = false;
    try {
      on = localStorage.getItem(KEY) === "1";
    } catch {}
    box.current.checked = on;
    apply(on);
  }, []);

  function onChange(e) {
    apply(e.target.checked);
    try {
      localStorage.setItem(KEY, e.target.checked ? "1" : "0");
    } catch {}
  }

  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-stone-500">
      <input ref={box} type="checkbox" onChange={onChange} className="accent-emerald-700" />
      Show sources
    </label>
  );
}
