import Link from "next/link";
import { Cpu } from "lucide-react";
import { WhatsAppLink } from "./whatsapp-link";
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Trustonics home">
      <span className="brand-mark">
        <Cpu size={23} strokeWidth={1.6} />
      </span>
      TRUSTONICS<span className="brand-period">.</span>
    </Link>
  );
}
export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container nav">
        <Brand />
        <nav aria-label="Main navigation">
          <Link className="nav-secondary" href="/#how-it-works">
            How it works
          </Link>
          <WhatsAppLink location="header" />
          <Link className="nav-cta" href="/request/need">
            Start a request
          </Link>
        </nav>
      </div>
    </header>
  );
}
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-row">
        <div>
          <Brand />
          <p>Your Laptop & PC Experts. From Shop to Door.</p>
        </div>
        <div>
          <p>Laptops. PCs. Custom Builds.</p>
          <Link href="/admin">Team sign in</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Trustonics</span>
        <span>Built around your needs. Pakistan.</span>
      </div>
    </footer>
  );
}
