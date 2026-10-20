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
    // a <select> has no defaultValue: its last saved choice is kept in data-saved
    const select = el.tagName === "SELECT";
    if (!el.name || el.type === "hidden" || el.value === (select ? el.dataset.saved : el.defaultValue)) return;
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
      setProblem(`${el.dataset.label ?? "This number"} ${why}`);
      return setStatus("invalid");
    }
    const data = new FormData();
    for (const hidden of el.form.querySelectorAll("input[type=hidden]")) data.append(hidden.name, hidden.value);
    data.append(el.name, el.value);
    if (select) el.dataset.saved = el.value; // before the save, so its blur doesn't send it again
    startTransition(async () => {
      try {
        await action(data);
        if (!select) el.defaultValue = el.value; // now the saved value
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
      onChange={(e) => e.target.tagName === "SELECT" && save(e.target)}
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
