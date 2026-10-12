"use client";

import { useState, useTransition } from "react";

/**
 * A form that saves each field when the farmer leaves it (or presses Enter): only that field is sent,
 * with the form's hidden inputs. The server action sets the edit cookie, which re-renders the page.
 */
export default function AutoSaveForm({ action, className, children }) {
  const [status, setStatus] = useState("idle");
  const [problem, setProblem] = useState("");
  const [pending, startTransition] = useTransition();

  function save(el) {
    if (!el.name || el.type === "hidden" || el.value === el.defaultValue) return;
    if (!el.checkValidity()) {
      // why, in our words (the browser's own message follows the browser's language), named after the field
      const v = el.validity;
      const why = v.valueMissing
        ? "needs a number"
        : v.badInput
          ? "isn’t a number"
          : v.rangeUnderflow
            ? `can’t be less than ${el.min}`
            : v.rangeOverflow
              ? `can’t be more than ${el.max}`
              : v.stepMismatch
                ? "has too many decimals"
                : "doesn’t look right";
      const label = el.closest("label")?.firstElementChild?.firstChild?.textContent?.trim();
      setProblem(`${label ?? "This number"} ${why}`);
      return setStatus("invalid");
    }
    const data = new FormData();
    for (const hidden of el.form.querySelectorAll("input[type=hidden]")) data.append(hidden.name, hidden.value);
    data.append(el.name, el.value);
    startTransition(async () => {
      try {
        await action(data);
        el.defaultValue = el.value; // now the saved value
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    });
  }

  const text = pending
    ? "Saving…"
    : { idle: "Changes save as you go", saved: "Saved ✓ Every page is recalculated", invalid: problem, error: "Couldn’t save. Try again" }[status];

  return (
    <form
      className={className}
      onSubmit={(e) => e.preventDefault()}
      onBlur={(e) => save(e.target)}
      onKeyDown={(e) => e.key === "Enter" && e.target.tagName === "INPUT" && (e.preventDefault(), save(e.target))}
    >
      {children}
      <p
        role="status"
        className={`sticky bottom-20 ml-auto w-fit rounded-full px-4 py-2 text-sm shadow-sm ring-1 lg:bottom-4 ${
          status === "invalid" || status === "error" ? "bg-red-50 text-red-800 ring-red-200" : "bg-white text-stone-700 ring-stone-200"
        }`}
      >
        {text}
      </p>
    </form>
  );
}
