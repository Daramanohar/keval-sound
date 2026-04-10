"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Headphones,
  Shield,
  Sparkles,
  Check,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import KevalLogo from "@/components/KevalLogo";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [showPassword, setShowPassword] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { isAuthenticated, isReady, login, register, loginWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isReady && isAuthenticated) router.replace("/");
  }, [isAuthenticated, isReady, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signin") {
      login(email, password);
    } else {
      register(name, email, password);
    }
    router.push("/");
  };

  const handleGoogle = () => {
    loginWithGoogle();
    router.replace("/");
  };

  const benefits = [
    { icon: Headphones, text: "Access 10,000+ exclusive Indian tracks" },
    { icon: Shield, text: "True ownership — once bought, gone forever" },
    { icon: Sparkles, text: "AI-powered search across 22+ languages" },
  ];

  return (
    <div className="min-h-screen flex relative overflow-hidden -mt-[72px] pt-[72px]">
      {/* Animated background */}
      <div className="absolute inset-0 bg-vampire-black">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-mid-purple/15 blur-[150px] animate-pulse-glow" />
          <div
            className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-grey-magenta/12 blur-[130px] animate-pulse-glow"
            style={{ animationDelay: "2s" }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] rounded-full bg-vivid-blue/8 blur-[100px] animate-pulse-glow"
            style={{ animationDelay: "4s" }}
          />
        </div>
      </div>

      {/* Left side - Branding (desktop only) */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative z-10 p-12">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-lg"
        >
          {/* Logo */}
          <div className="mb-12">
            <KevalLogo size="lg" showTagline={false} />
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
            Where Every Beat Finds Its{" "}
            <span className="gradient-text">One True Home</span>
          </h1>

          <p className="text-lg text-muted leading-relaxed mb-10">
            Join India&apos;s most exclusive music licensing platform.
            Discover sounds across 22+ regional languages that belong only to you.
          </p>

          {/* Benefits */}
          <div className="space-y-4">
            {benefits.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.15 }}
                className="flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-vivid-blue/10 flex items-center justify-center shrink-0">
                  <b.icon className="w-5 h-5 text-vivid-blue" />
                </div>
                <span className="text-sm text-light-grey/80">{b.text}</span>
              </motion.div>
            ))}
          </div>

          {/* Social proof */}
          <div className="mt-12 flex items-center gap-4">
            <div className="flex -space-x-2">
              {["bg-vivid-blue", "bg-mid-purple", "bg-grey-magenta", "bg-grey-azure"].map(
                (bg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 border-vampire-black flex items-center justify-center text-[10px] font-bold text-white",
                      bg
                    )}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                )
              )}
            </div>
            <p className="text-xs text-muted">
              <span className="text-white font-medium">2,400+</span> creators
              already on board
            </p>
          </div>
        </motion.div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center relative z-10 p-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <KevalLogo size="md" showTagline={false} />
          </div>

          <div className="glass rounded-2xl p-8 relative overflow-hidden">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-mid-purple/5 via-transparent to-vivid-blue/5 pointer-events-none" />

            <div className="relative z-10">
              {/* Tab Toggle */}
              <div className="flex rounded-xl bg-white/[0.04] p-1 mb-8">
                {(["signup", "signin"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setMode(tab)}
                    className={cn(
                      "flex-1 py-2.5 text-sm font-medium rounded-lg transition-all",
                      mode === tab
                        ? "bg-vivid-blue text-white shadow-lg shadow-vivid-blue/20"
                        : "text-muted hover:text-white"
                    )}
                  >
                    {tab === "signup" ? "Create Account" : "Sign In"}
                  </button>
                ))}
              </div>

              {/* Heading */}
              <h2 className="text-xl font-bold text-white mb-1">
                {mode === "signup"
                  ? "Start Your Journey"
                  : "Welcome Back"}
              </h2>
              <p className="text-sm text-muted mb-6">
                {mode === "signup"
                  ? "Create your account and discover exclusive sounds"
                  : "Sign in to continue your music journey"}
              </p>

              {/* Google Button */}
              <button
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-border hover:bg-white/[0.04] transition-colors mb-4"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span className="text-sm font-medium text-white">
                  Continue with Google
                </span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted">or continue with email</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full name"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-border text-sm text-white placeholder:text-muted/50 outline-none focus:border-vivid-blue/50 focus:ring-1 focus:ring-vivid-blue/20 transition-all"
                    />
                  </div>
                )}

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-border text-sm text-white placeholder:text-muted/50 outline-none focus:border-vivid-blue/50 focus:ring-1 focus:ring-vivid-blue/20 transition-all"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className="w-full pl-10 pr-12 py-3 rounded-xl bg-white/[0.04] border border-border text-sm text-white placeholder:text-muted/50 outline-none focus:border-vivid-blue/50 focus:ring-1 focus:ring-vivid-blue/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {mode === "signin" && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setInfoMessage(
                          email
                            ? `Password reset instructions will be sent to ${email}.`
                            : "Enter your email first and we will send reset instructions."
                        )
                      }
                      className="text-xs text-vivid-blue hover:text-accent-hover transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {infoMessage && (
                  <div className="rounded-xl bg-vivid-blue/10 text-vivid-blue text-xs px-3 py-2">
                    {infoMessage}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-vivid-blue to-mid-purple text-white font-semibold hover:shadow-lg hover:shadow-vivid-blue/20 transition-all hover:-translate-y-0.5"
                >
                  {mode === "signup" ? "Create Account" : "Sign In"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Terms */}
              {mode === "signup" && (
                <p className="text-[10px] text-muted/60 text-center mt-4 leading-relaxed">
                  By creating an account, you agree to our{" "}
                  <span className="text-muted hover:text-white cursor-pointer">
                    Terms of Service
                  </span>{" "}
                  and{" "}
                  <span className="text-muted hover:text-white cursor-pointer">
                    Privacy Policy
                  </span>
                </p>
              )}

              {/* Features checklist for signup */}
              {mode === "signup" && (
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-xs font-medium text-white mb-3">
                    What you get:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "AI-powered search",
                      "Exclusive licensing",
                      "Instant downloads",
                      "22+ languages",
                      "Stem access",
                      "Priority support",
                    ].map((feature) => (
                      <div
                        key={feature}
                        className="flex items-center gap-1.5 text-[11px] text-muted"
                      >
                        <Check className="w-3 h-3 text-vivid-blue shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
