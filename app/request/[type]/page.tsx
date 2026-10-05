import { notFound } from "next/navigation";
import { SiteHeader, SiteFooter } from "@/components/site-shell";
import { RequestForm } from "@/components/request-form";
export default async function RequestPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  if (type !== "need" && type !== "model") notFound();
  return (
    <>
      <SiteHeader />
      <main className="page-background">
        <div className="container">
          <RequestForm type={type === "need" ? "NEED_BASED" : "EXACT_MODEL"} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
