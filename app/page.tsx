import Link from "next/link";
import {
  Laptop,
  ScanLine,
  SlidersHorizontal,
  Check,
  MessageSquareText,
  UserRound,
  PackageCheck,
} from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-shell";
import { WhatsAppLink } from "@/components/whatsapp-link";
const paths = [
  {
    n: "01",
    icon: Laptop,
    title: "I know what I need",
    text: "A budget. A purpose. That’s enough. Tell us how you work, study or play.",
    cta: "Find one for me",
    href: "/request/need",
    tag: "A little guidance",
  },
  {
    n: "02",
    icon: ScanLine,
    title: "I know what I want",
    text: "Already have a model in mind? Give us the details. We’ll take it from there.",
    cta: "Find my laptop",
    href: "/request/model",
    tag: "Something specific",
  },
  {
    n: "03",
    icon: SlidersHorizontal,
    title: "Build your own",
    text: "Your specs, your priorities. Share your ideal desktop or laptop requirements.",
    cta: "Start a build request",
    href: "/builder",
    tag: "Made around you",
  },
];
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero container">
          <div className="eyebrow">
            <span className="little-line" />
            LESS SEARCHING. BETTER CHOICES.
          </div>
          <div className="hero-grid">
            <h1>
              JUST TELL US
              <br />
              WHAT YOU <span>NEED.</span>
            </h1>
            <div className="hero-aside">
              <p>
                Your trusted laptop & PC experts,
                <br />
                from shop to door.
              </p>
              <div className="hero-caption">
                The right machine starts
                <br />
                with the right conversation.
              </div>
            </div>
          </div>
          <div className="path-grid">
            {paths.map((p) => (
              <Link className="path-card" href={p.href} key={p.n}>
                <div className="path-top">
                  <p.icon size={27} strokeWidth={1.4} />
                  <span>{p.n}</span>
                </div>
                <span className="small-label">{p.tag}</span>
                <h2>{p.title}</h2>
                <p>{p.text}</p>
                <div className="path-action">
                  {p.cta}
                  <span className="plus">+</span>
                </div>
              </Link>
            ))}
          </div>
          <div className="hero-footnote">
            <span>
              <Check size={15} /> Personal guidance
            </span>
            <span>
              <Check size={15} /> Your budget comes first
            </span>
            <span>
              <Check size={15} /> New & used options
            </span>
          </div>
        </section>
        <section className="how-section" id="how-it-works">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">A SIMPLER WAY</span>
                <h2>
                  You tell us.
                  <br />
                  We take it from there.
                </h2>
              </div>
              <p>
                No need to know every processor,
                <br />
                generation or graphics card.
              </p>
            </div>
            <div className="how-grid">
              {[
                {
                  n: "01",
                  icon: MessageSquareText,
                  title: "Tell us what you need",
                  text: "Share your requirements, budget and preferences.",
                },
                {
                  n: "02",
                  icon: UserRound,
                  title: "Talk to an expert",
                  text: "We review your request and reach out personally.",
                },
                {
                  n: "03",
                  icon: ScanLine,
                  title: "Know your options",
                  text: "We discuss suitable machines and confirm pricing with you.",
                },
                {
                  n: "04",
                  icon: PackageCheck,
                  title: "We handle the rest",
                  text: "Sourcing and next steps, coordinated with you personally.",
                },
              ].map((s) => (
                <div className="how-item" key={s.n}>
                  <div className="how-number">
                    {s.n}
                    <s.icon size={21} />
                  </div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="why-section container">
          <div>
            <span className="eyebrow">WHY TRUSTONICS</span>
            <h2>
              Technology is complex.
              <br />
              <span>Finding yours shouldn’t be.</span>
            </h2>
          </div>
          <div className="why-list">
            {[
              "No endless searching.",
              "No random sellers.",
              "No guessing.",
            ].map((s, i) => (
              <div key={s}>
                <span>0{i + 1}</span>
                <h3>{s}</h3>
                <Check size={20} />
              </div>
            ))}
          </div>
        </section>
        <section className="builder-teaser container">
          <div className="teaser-icon">
            <SlidersHorizontal size={45} strokeWidth={1.2} />
          </div>
          <div>
            <span className="eyebrow">YOUR SPECS. YOUR CALL.</span>
            <h2>Have a build in mind?</h2>
            <p>
              A desktop from scratch or a laptop with specific specs.
              <br />
              Tell us what matters. We’ll help with the possibilities.
            </p>
          </div>
          <Link className="button button-outline" href="/builder">
            Share your build
          </Link>
        </section>
        <section className="final-cta">
          <div className="container">
            <span className="eyebrow">LET’S FIND YOUR FIT</span>
            <h2>
              JUST TELL US.
              <br />
              WE’LL HANDLE THE REST.
            </h2>
            <div className="button-row">
              <Link className="button button-primary" href="/request/need">
                Start your request
              </Link>
              <WhatsAppLink location="final" />
            </div>
            <p>A real conversation. A machine that makes sense for you.</p>
          </div>
        </section>
      </main>
      <SiteFooter />
      <WhatsAppLink location="floating" className="floating-whatsapp">
        Chat
      </WhatsAppLink>
    </>
  );
}
