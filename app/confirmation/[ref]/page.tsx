import { notFound } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-shell";
import { WhatsAppLink } from "@/components/whatsapp-link";
export const metadata = {
  title: "Request received",
  robots: { index: false, follow: false },
};
export default async function Confirmation({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  if (!/^TR-\d{6}$/.test(ref)) notFound();
  return (
    <>
      <SiteHeader />
      <main className="page-background">
        <div className="container">
          <div className="form-card confirmation">
            <div className="confirmation-icon">
              <Check size={30} />
            </div>
            <span className="eyebrow" style={{ justifyContent: "center" }}>
              YOU’VE DONE YOUR PART
            </span>
            <h1>Request received.</h1>
            <p>
              A Trustonics expert will review your requirements and get back to
              you on WhatsApp, or through your preferred contact method.
            </p>
            <div className="ref-box">
              <span>Your request ID</span>
              <strong>{ref}</strong>
              <p className="contact-footnote">
                Keep this reference for your conversation with us.
              </p>
            </div>
            <div className="button-row">
              <Link className="button button-outline" href="/">
                Back to home
              </Link>
              <WhatsAppLink location="confirmation" requestRef={ref}>
                Questions? Chat with us
              </WhatsAppLink>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
