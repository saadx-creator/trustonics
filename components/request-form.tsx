"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Info, LoaderCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { SelectField } from "./ui/select";
import { WhatsAppLink } from "./whatsapp-link";
import {
  contactSchema,
  detailsSchema,
  requestSchema,
  typeLabels,
  requestTypes,
} from "@/lib/validation";
import { formatPKR } from "@/lib/whatsapp";
const meta = {
  NEED_BASED: {
    title: "Let’s find your fit.",
    description:
      "Tell us what you’ll use it for. You don’t need to know the technical details.",
    placeholder:
      "For example: I’m a university student. I need a lightweight laptop for programming, online classes and a little gaming.",
  },
  EXACT_MODEL: {
    title: "You’ve got something in mind.",
    description:
      "Share the model and specs you want. We’ll help with the next steps.",
    placeholder:
      "For example: Lenovo ThinkPad T14 Gen 2, 16GB RAM, 512GB SSD, preferably used.",
  },
  CUSTOM_BUILD: {
    title: "Your specs. Your priorities.",
    description:
      "Tell us about your ideal desktop or laptop. We’ll help you explore what’s possible.",
    placeholder:
      "For example: A desktop with Core i7 10th gen, 16GB RAM, 512GB SSD and a 4GB dedicated GPU. I already have a monitor.",
  },
};
export function RequestForm({
  type,
  manual = false,
}: {
  type: (typeof requestTypes)[number];
  manual?: boolean;
}) {
  const router = useRouter();
  const [requestType, setRequestType] = useState(type);
  const [step, setStep] = useState(0);
  const [original, setOriginal] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [condition, setCondition] = useState<"NEW" | "USED" | "EITHER">(
    "EITHER",
  );
  const [city, setCity] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState<"WHATSAPP" | "EMAIL" | "PHONE">(
    "WHATSAPP",
  );
  const [consent, setConsent] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submissionKey = useRef<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const content = meta[requestType];
  const details = () => ({
    request_type: requestType,
    original_message: original,
    budget_min: min === "" ? undefined : Number(min),
    budget_max: max === "" ? undefined : Number(max),
    condition,
    city,
  });
  const customer = () => ({
    name,
    whatsapp,
    email: email.trim(),
    preferred_contact_method: contact,
    consent_given: consent,
  });
  const move = (n: number) => {
    setError("");
    setStep(n);
    setTimeout(() => {
      headingRef.current?.focus();
      headingRef.current?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    }, 0);
  };
  const proceed = () => {
    const detailCheck = detailsSchema.safeParse(details());
    if (!detailCheck.success) {
      setError(detailCheck.error.issues[0].message);
      return;
    }
    const parsed =
      step === 0 ? detailCheck : contactSchema.safeParse(customer());
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    move(step + 1);
  };
  async function submit() {
    if (busy || submitted) return;
    setError("");
    if (!submissionKey.current) submissionKey.current = crypto.randomUUID();
    const parsed = requestSchema.safeParse({
      details: details(),
      contact: customer(),
      submission_key: submissionKey.current,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        manual ? "/api/admin/requests" : "/api/requests",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            manual ? { request: parsed.data, note } : parsed.data,
          ),
        },
      );
      const result = await res.json();
      if (!res.ok)
        throw new Error(
          result.error || "Something went wrong. Please try again.",
        );
      setSubmitted(true);
      router.push(
        manual ? `/admin/requests/${result.id}` : `/confirmation/${result.ref}`,
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
      setBusy(false);
    }
  }
  return (
    <div className="flow-layout">
      <aside className="flow-aside">
        <Link className="back-link" href={manual ? "/admin" : "/"}>
          {manual ? "Back to dashboard" : "Back to all options"}
        </Link>
        <h1>{manual ? "Add a WhatsApp request." : content.title}</h1>
        <p>
          {manual
            ? "Keep the customer’s own words and record their permission to follow up."
            : content.description}
        </p>
        <div className="steps" aria-label="Request progress">
          {["Your request", "Contact details", "Review & send"].map(
            (label, i) => (
              <div
                key={label}
                className={`step ${step === i ? "active" : step > i ? "completed" : ""}`}
                aria-current={step === i ? "step" : undefined}
              >
                <span className="step-number">
                  {step > i ? <Check size={14} /> : i + 1}
                </span>
                {label}
              </div>
            ),
          )}
        </div>
        <div className="flow-note">
          {manual
            ? "Source: WhatsApp direct. Internal notes stay private."
            : "Your requirements, your budget. A real person will take it from here."}
        </div>
      </aside>
      <div>
        <form
          className="form-card"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            step < 2 ? proceed() : submit();
          }}
        >
          <h2 tabIndex={-1} ref={headingRef}>
            {
              [
                "What are you looking for?",
                "How can we get back to you?",
                "Everything look right?",
              ][step]
            }
          </h2>
          <p className="form-intro">
            {
              [
                "A few details will help us understand your request.",
                "We’ll only use these details to handle your request.",
                "Check your request and contact details before sending.",
              ][step]
            }
          </p>
          {step === 0 && (
            <>
              {manual && (
                <SelectField
                  id="request-type"
                  label="Request type"
                  value={requestType}
                  onChange={(v) => setRequestType(v as typeof type)}
                  options={requestTypes.map((t) => ({
                    value: t,
                    label: typeLabels[t],
                  }))}
                />
              )}
              <div className="field">
                <label htmlFor="original">
                  {manual ? "Original customer message" : "Your request"}
                </label>
                <textarea
                  id="original"
                  value={original}
                  onChange={(e) => setOriginal(e.target.value)}
                  maxLength={5000}
                  placeholder={content.placeholder}
                  required
                />
                <small>
                  Your original words will be saved exactly as written.
                </small>
              </div>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="budget-min">
                    Budget from <span>Optional · PKR</span>
                  </label>
                  <input
                    id="budget-min"
                    inputMode="numeric"
                    type="number"
                    min="0"
                    max="100000000"
                    value={min}
                    onChange={(e) => setMin(e.target.value)}
                    placeholder="e.g. 60,000"
                  />
                </div>
                <div className="field">
                  <label htmlFor="budget-max">
                    Budget up to <span>Optional · PKR</span>
                  </label>
                  <input
                    id="budget-max"
                    inputMode="numeric"
                    type="number"
                    min="0"
                    max="100000000"
                    value={max}
                    onChange={(e) => setMax(e.target.value)}
                    placeholder="e.g. 90,000"
                  />
                </div>
              </div>
              <div className="field-grid">
                <SelectField
                  id="condition"
                  label="Condition"
                  value={condition}
                  onChange={(v) => setCondition(v as typeof condition)}
                  options={[
                    { value: "EITHER", label: "New or used" },
                    { value: "NEW", label: "New" },
                    { value: "USED", label: "Used" },
                  ]}
                />
                <div className="field">
                  <label htmlFor="city">City</label>
                  <input
                    id="city"
                    autoComplete="address-level2"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    maxLength={100}
                    placeholder="e.g. Lahore"
                    required
                  />
                </div>
              </div>
              <div className="notice">
                <Info size={18} />
                <div>
                  <strong>
                    {requestType === "CUSTOM_BUILD"
                      ? "Share your specs. We’ll confirm the possibilities."
                      : "We’ll find the price for you."}
                  </strong>
                  <p>
                    {requestType === "CUSTOM_BUILD"
                      ? "The interactive builder and instant prices aren’t available yet. You can still send your requirements for a personal review."
                      : "Instant estimates aren’t available yet. Submit your request and a Trustonics expert will confirm options and pricing."}
                  </p>
                </div>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <div className="field">
                <label htmlFor="name">
                  {manual ? "Customer name" : "Your name"}
                </label>
                <input
                  id="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                  placeholder="Full name"
                />
              </div>
              <div className="field">
                <label htmlFor="whatsapp">WhatsApp number</label>
                <input
                  id="whatsapp"
                  type="tel"
                  autoComplete="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  maxLength={32}
                  placeholder="0300 1234567"
                  required
                />
                <small>
                  Pakistani and international numbers are supported.
                </small>
              </div>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="contact-city">City</label>
                  <input
                    id="contact-city"
                    autoComplete="address-level2"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    maxLength={100}
                    required
                  />
                </div>
                <SelectField
                  id="preferred-contact"
                  label="Preferred contact"
                  value={contact}
                  onChange={(v) => setContact(v as typeof contact)}
                  options={[
                    { value: "WHATSAPP", label: "WhatsApp" },
                    { value: "EMAIL", label: "Email" },
                    { value: "PHONE", label: "Phone call" },
                  ]}
                />
              </div>
              <div className="field">
                <label htmlFor="email">
                  Email{" "}
                  <span>
                    {contact === "EMAIL"
                      ? "Required for email contact"
                      : "Optional"}
                  </span>
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={254}
                  placeholder="you@example.com"
                />
              </div>
              {manual && (
                <div className="field">
                  <label htmlFor="manual-note">
                    Internal note <span>Optional</span>
                  </label>
                  <textarea
                    id="manual-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={5000}
                  />
                </div>
              )}
              <div className="consent">
                <Checkbox
                  id="consent"
                  checked={consent}
                  onCheckedChange={(v) => setConsent(v === true)}
                />
                <label htmlFor="consent">
                  {manual
                    ? "The customer has agreed that Trustonics may contact them regarding this request."
                    : "I agree that Trustonics may contact me regarding this request."}
                </label>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <section className="review-block">
                <h3>{typeLabels[requestType]} request</h3>
                <div className="original-message">{original}</div>
                <dl className="details-list">
                  <div>
                    <dt>Budget (PKR)</dt>
                    <dd>
                      {min || max
                        ? `${min ? formatPKR(Number(min)) : "Not specified"} – ${max ? formatPKR(Number(max)) : "Not specified"}`
                        : "Not specified"}
                    </dd>
                  </div>
                  <div>
                    <dt>Condition</dt>
                    <dd>
                      {condition === "EITHER"
                        ? "New or used"
                        : condition === "NEW"
                          ? "New"
                          : "Used"}
                    </dd>
                  </div>
                </dl>
              </section>
              <section className="review-block">
                <h3>Estimate</h3>
                <p className="form-intro" style={{ margin: 0 }}>
                  No estimate yet. A Trustonics expert will confirm pricing with
                  you.
                </p>
              </section>
              <section className="review-block">
                <h3>Contact details</h3>
                <dl className="details-list">
                  <div>
                    <dt>Name</dt>
                    <dd>{name}</dd>
                  </div>
                  <div>
                    <dt>WhatsApp</dt>
                    <dd>{whatsapp}</dd>
                  </div>
                  <div>
                    <dt>City</dt>
                    <dd>{city}</dd>
                  </div>
                  <div>
                    <dt>Preferred contact</dt>
                    <dd>
                      {contact === "WHATSAPP"
                        ? "WhatsApp"
                        : contact === "EMAIL"
                          ? "Email"
                          : "Phone call"}
                    </dd>
                  </div>
                  {email && (
                    <div>
                      <dt>Email</dt>
                      <dd>{email}</dd>
                    </div>
                  )}
                </dl>
                <p className="contact-footnote">
                  Permission to contact: given.
                </p>
              </section>
              {manual && note && (
                <section className="review-block">
                  <h3>Internal note</h3>
                  <p className="original-message">{note}</p>
                </section>
              )}
              <p className="contact-footnote">
                Submitting a request is not a purchase. Final options and prices
                will be discussed with you personally.
              </p>
            </>
          )}
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          <div className="form-actions">
            {step > 0 && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => move(step - 1)}
              >
                Back
              </Button>
            )}
            <Button type="submit" disabled={busy || submitted}>
              {busy && <LoaderCircle size={17} className="spin" />}
              {step === 0
                ? "Continue with this request"
                : step === 1
                  ? "Review request"
                  : busy
                    ? "Submitting…"
                    : "Submit request"}
            </Button>
          </div>
        </form>
        {!manual && (
          <div className="flow-form-whatsapp">
            <WhatsAppLink
              location={requestType === "CUSTOM_BUILD" ? "builder" : "request"}
              message={original}
              build={requestType === "CUSTOM_BUILD"}
            >
              Prefer to chat? Message us on WhatsApp
            </WhatsAppLink>
          </div>
        )}
      </div>
    </div>
  );
}
