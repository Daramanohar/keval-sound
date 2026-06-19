import Image from "next/image";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import KevalLogo from "@/components/KevalLogo";

// TODO(security): wire Cloudflare Turnstile / Clerk bot protection in a
// future milestone. Clerk handles password+email+Google for now.

export const metadata = {
  title: "Log into Keval Sound",
  description: "Sign in to your Keval Sound account.",
};

export default function SignInPage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-vampire-black overflow-hidden">
      {/* Ambient brand glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 -left-32 h-[520px] w-[520px] rounded-full bg-mid-purple/20 blur-[140px]" />
        <div className="absolute bottom-0 -right-24 h-[460px] w-[460px] rounded-full bg-vivid-blue/15 blur-[120px]" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-10">
        <Link href="/" aria-label="Keval Sound home" className="inline-flex">
          <KevalLogo size="sm" showTagline={false} />
        </Link>
        <Link
          href="/sign-up"
          className="text-xs font-medium text-muted hover:text-white transition-colors"
        >
          New here? <span className="text-vivid-blue">Create account</span>
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="mx-auto flex w-full max-w-[520px] flex-col items-center">
          <div className="w-full rounded-3xl bg-white p-8 shadow-2xl shadow-black/40 sm:p-10">
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/logo/keval-logo.png"
                  alt="Keval Sound"
                  width={32}
                  height={32}
                  className="object-contain"
                  priority
                />
                <span className="text-sm font-bold tracking-wider text-gray-900">
                  Keval Sound
                </span>
              </div>
              <h1 className="mt-5 text-2xl font-semibold text-gray-900 sm:text-3xl">
                Log into your account
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                Welcome back. Pick up where you left off.
              </p>
            </div>

            <SignIn
              routing="path"
              path="/sign-in"
              signUpUrl="/sign-up"
              forceRedirectUrl="/browse"
              appearance={{
                elements: {
                  rootBox: "mx-auto flex w-full justify-center",
                  card: "mx-auto w-full max-w-[408px] shadow-none bg-transparent p-0",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  footer: "hidden",
                  socialButtonsBlockButton:
                    "border border-gray-200 hover:bg-gray-50 text-gray-800",
                  formButtonPrimary:
                    "bg-[#4f89ff] hover:bg-[#3a73e6] text-white normal-case font-semibold",
                  formFieldInput:
                    "border-gray-200 focus:border-[#4f89ff] focus:ring-[#4f89ff]",
                  dividerLine: "bg-gray-200",
                  dividerText: "text-gray-400",
                },
                layout: {
                  socialButtonsPlacement: "top",
                  socialButtonsVariant: "blockButton",
                },
              }}
            />

            <p className="mt-6 text-center text-sm text-gray-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/sign-up"
                className="font-semibold text-[#4f89ff] hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-[11px] text-muted/60">
            By signing in you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </main>
    </div>
  );
}
