"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import KevalLogo from "./KevalLogo";

const footerColumns = {
  Discover: [
    { label: "Browse Tracks", href: "/explore" },
    { label: "Explore Song Packs", href: "/packs" },
    { label: "Samples & Loops", href: "/samples" },
    { label: "Trending Exclusives", href: "/explore" },
  ],
  Ownership: [
    { label: "How Licensing Works", href: "/account?tab=licensing" },
    { label: "Purchases", href: "/account?tab=history" },
    { label: "Downloads", href: "/account?tab=downloads" },
    { label: "Wishlist", href: "/account?tab=wishlist" },
  ],
  Creators: [
    { label: "For Filmmakers", href: "/explore" },
    { label: "For Content Creators", href: "/explore" },
    { label: "For Musicians", href: "/explore" },
    { label: "Recently Played", href: "/account?tab=recent" },
  ],
  Support: [
    { label: "Customer Support", href: "/account?tab=support" },
    { label: "Billing", href: "/account?tab=billing" },
    { label: "Desktop App", href: "/account?tab=desktop" },
    { label: "Settings", href: "/account?tab=settings" },
  ],
  Company: [
    { label: "About KEVAL SOUND", href: "/" },
    { label: "Privacy Policy", href: "/account?tab=legal" },
    { label: "Terms of Service", href: "/account?tab=legal" },
    { label: "Licensing Agreement", href: "/account?tab=licensing" },
  ],
};

const legalLinks = [
  { label: "Terms", href: "/account?tab=legal" },
  { label: "Privacy", href: "/account?tab=legal" },
  { label: "Licenses", href: "/account?tab=licensing" },
  { label: "Support", href: "/account?tab=support" },
];

function getContextLine(pathname: string): string {
  if (pathname === "/explore") return "Search exclusive songs by mood, BPM, genre, language, and regional character.";
  if (pathname === "/packs") return "Bundle pricing for full packs, or license the exact songs you need one by one.";
  if (pathname === "/samples") return "Production-ready Indian loops, one-shots, and stems for faster sessions.";
  if (pathname === "/cart") return "Review your mixed cart of single tracks, packs, and samples before checkout.";
  if (pathname.startsWith("/pack/")) return "Preview the full pack, then choose between a bundle purchase or individual tracks.";
  return "Exclusive Indian music licensing built for creators who want sounds they can truly own.";
}

export default function Footer() {
  const pathname = usePathname();

  if (pathname === "/auth") return null;

  const socialLinks = [
    { label: "Instagram", href: "https://instagram.com" },
    { label: "YouTube", href: "https://youtube.com" },
    { label: "LinkedIn", href: "https://linkedin.com" },
    { label: "X", href: "https://x.com" },
  ];

  return (
    <footer className="relative border-t border-white/[0.06] bg-[#08091a]">
      <div className="mx-auto max-w-7xl px-6 pb-10 pt-14">
        <div className="grid gap-10 md:grid-cols-[1.15fr_repeat(5,minmax(0,1fr))]">
          <div>
            <KevalLogo size="sm" showTagline={false} />
            <p className="mt-4 max-w-[260px] text-xs leading-relaxed text-muted/60">
              {getContextLine(pathname)}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-white/[0.04] px-3 py-2 text-[11px] font-medium text-muted/50 transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                  {social.label}
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerColumns).map(([category, links]) => (
            <div key={category}>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-xs text-muted/55 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/[0.04]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-5 sm:flex-row">
          <p className="text-[11px] text-muted/35">
            © 2026 KEVAL SOUND Pvt. Ltd. Exclusive music licensing for creators across India.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-5">
            {legalLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[11px] text-muted/35 transition-colors hover:text-muted/75"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
