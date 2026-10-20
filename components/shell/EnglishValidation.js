"use client";

import { useEffect } from "react";
import { whyInvalid } from "@/lib/validation";

/**
 * Every form's validation bubble in English: the browser writes them in its own language ("Completa este
 * campo"), so the message is replaced when a field is invalid and cleared as soon as it changes.
 */
export default function EnglishValidation() {
  useEffect(() => {
    const onInvalid = (e) => e.target.setCustomValidity?.(`This ${whyInvalid(e.target)}.`.replace("This needs", "This field needs"));
    const onInput = (e) => e.target.setCustomValidity?.("");
    document.addEventListener("invalid", onInvalid, true);
    document.addEventListener("input", onInput, true);
    return () => {
      document.removeEventListener("invalid", onInvalid, true);
      document.removeEventListener("input", onInput, true);
    };
  }, []);
  return null;
}
