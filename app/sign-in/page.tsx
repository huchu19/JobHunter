import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Logo from "@/app/components/Logo";
import { auth, signIn } from "@/app/auth";

export const metadata = {
  title: "Sign in — JobHunter",
  description: "Sign in to your private job-application board.",
};

const googleConfigured =
  !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  const redirectTo = callbackUrl || "/dashboard";

  // Already signed in → straight to the board.
  if (session?.user) redirect(redirectTo);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="h-8 w-8" />
            <span className="display text-base font-semibold tracking-tight">
              JobHunter
            </span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <h1 className="display text-2xl text-foreground">Sign in</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Your board, profile, and saved roles are private to your account.
          </p>

          {googleConfigured ? (
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo });
              }}
              className="mt-6"
            >
              <button
                type="submit"
                className="btn-brand inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold"
              >
                Continue with Google
                <ArrowRight size={16} strokeWidth={2.4} />
              </button>
            </form>
          ) : (
            <p className="mt-6 rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm text-muted">
              Sign-in is not configured on this deployment
              (<code>AUTH_GOOGLE_ID</code> / <code>AUTH_GOOGLE_SECRET</code> are
              unset).
            </p>
          )}

          <p className="mt-6 text-center text-xs text-muted-2">
            By continuing you agree this is a personal job-tracking tool.
          </p>
        </div>
      </main>
    </div>
  );
}
