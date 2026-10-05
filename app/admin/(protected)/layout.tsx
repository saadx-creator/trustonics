import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin";
import { Brand } from "@/components/site-shell";
import { SignOut } from "@/components/sign-out";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Team workspace",
  robots: { index: false, follow: false },
};
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdmin();
  if (!user) redirect("/admin/login");
  return (
    <>
      <header className="admin-header">
        <div className="container admin-nav">
          <div className="admin-nav-left">
            <Brand />
            <Link href="/admin" className="workspace-label">
              TEAM WORKSPACE
            </Link>
          </div>
          <SignOut />
        </div>
      </header>
      <main className="admin-page">
        <div className="container">{children}</div>
      </main>
    </>
  );
}
