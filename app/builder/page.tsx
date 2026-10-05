import { SiteHeader, SiteFooter } from "@/components/site-shell";
import { RequestForm } from "@/components/request-form";
export const metadata = { title: "Your build request" };
export default function BuilderPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-background">
        <div className="container">
          <RequestForm type="CUSTOM_BUILD" />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
