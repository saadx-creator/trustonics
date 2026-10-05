export type WhatsAppLocation =
  | "header"
  | "floating"
  | "final"
  | "request"
  | "builder"
  | "confirmation";
const generic = "Hi Trustonics, I'd like help finding a laptop/PC.";
// User-entered requirements may contain contact details; strip common personal-data patterns.
export function safeSummary(input: string) {
  return input
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email omitted]")
    .replace(/(?:\+?\d[\s().-]*){8,}/g, "[number omitted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}
export function businessWhatsApp(
  number: string | undefined,
  context?: { message?: string; ref?: string; build?: boolean },
) {
  if (!number || !/^[1-9]\d{7,14}$/.test(number)) return null;
  const summary = safeSummary(context?.message || "");
  const text =
    context?.ref && /^TR-\d{6,}$/.test(context.ref)
      ? `Hi Trustonics, regarding request ${context.ref}.`
      : summary
        ? `Hi Trustonics, ${context?.build ? "I'd like this build" : "I'm looking for"}: ${summary}.`
        : generic;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
export const formatPKR = (value: number) =>
  new Intl.NumberFormat("en-PK").format(value);
