/** Why a form field is invalid, in our words (the browser's own messages follow the browser's language). */
export function whyInvalid(el) {
  const v = el.validity;
  if (v.valueMissing) return el.type === "number" ? "needs a number" : "needs filling in";
  if (v.badInput) return "isn’t a number";
  if (v.rangeUnderflow) return `can’t be less than ${el.min}`;
  if (v.rangeOverflow) return `can’t be more than ${el.max}`;
  if (v.stepMismatch) return "has too many decimals";
  if (v.tooLong) return `can’t be longer than ${el.maxLength} characters`;
  return "doesn’t look right";
}
