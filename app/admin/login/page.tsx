import { Brand } from "@/components/site-shell";
import { LoginForm } from "@/components/login-form";
export const metadata = {
  title: "Team sign in",
  robots: { index: false, follow: false },
};
export default function Login() {
  return (
    <main className="page-background">
      <div className="container">
        <div className="login-wrap">
          <Brand />
          <div className="form-card">
            <h1>Welcome back.</h1>
            <p className="form-intro">
              Sign in to the Trustonics team workspace.
            </p>
            <LoginForm />
            <p className="contact-footnote">
              Administrator access only. Customers don’t need an account to
              submit a request.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
