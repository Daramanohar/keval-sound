"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import KevalLogo from "./KevalLogo";

interface FooterLink {
  label: string;
  href: string;
  document?: boolean;
}

const footerColumns: Array<{ title: string; links: FooterLink[] }> = [
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/legal/about-us.pdf", document: true },
      { label: "Pricing", href: "/legal/pricing.pdf", document: true },
    ],
  },
  {
    title: "Policies",
    links: [
      { label: "Privacy Policy", href: "/legal/privacy-policy.pdf", document: true },
      { label: "Terms of Service", href: "/legal/terms-of-service.pdf", document: true },
      {
        label: "Refund & Cancellation Policy",
        href: "/legal/refund-and-cancellation-policy.pdf",
        document: true,
      },
      {
        label: "Digital Delivery Policy",
        href: "/legal/digital-delivery-policy.pdf",
        document: true,
      },
    ],
  },
  {
    title: "Rights & Earnings",
    links: [
      { label: "License Terms", href: "/legal/license-terms.pdf", document: true },
      { label: "Monetization Policy", href: "/legal/monetization-policy.pdf", document: true },
    ],
  },
];

function getContextLine(pathname: string): string {
  if (pathname === "/contact") {
    return "Support, privacy assistance, and payment-related help from the KEVAL SOUND team.";
  }

  return "Exclusive music discovery and licensing for creators, producers, brands, and listeners.";
}

function FooterNavLink({ link }: { link: FooterLink }) {
  const className =
    "group inline-flex items-center gap-1.5 text-sm leading-6 text-muted/65 transition-colors hover:text-white focus-visible:text-white";

  if (link.document) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
        <span>{link.label}</span>
        <ExternalLink
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 text-muted/35 transition-colors group-hover:text-dandelion"
        />
      </a>
    );
  }

  return (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );
}

export default function Footer() {
  const pathname = usePathname();

  if (pathname === "/auth") return null;

  return (
    <footer className="relative border-t border-white/[0.07] bg-[#08091a]">
      <div className="h-px bg-gradient-to-r from-transparent via-zesty-red/70 to-dandelion/70" />

      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-12 sm:grid-cols-2 lg:grid-cols-[1.35fr_0.7fr_1.15fr_0.85fr] lg:gap-10 lg:py-14">
        <div className="sm:col-span-2 lg:col-span-1">
          <KevalLogo size="sm" showTagline={false} />
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted/60">
            {getContextLine(pathname)}
          </p>
          <Link
            href="/contact"
            className="mt-6 inline-flex h-10 items-center justify-center rounded-md border border-dandelion/30 bg-dandelion/10 px-4 text-sm font-semibold text-dandelion transition-colors hover:border-dandelion/55 hover:bg-dandelion/15"
          >
            Contact Us
          </Link>
        </div>

        {footerColumns.map((column) => (
          <nav key={column.title} aria-label={`${column.title} footer links`}>
            <h2 className="mb-4 text-xs font-semibold uppercase text-light-grey/80">
              {column.title}
            </h2>
            <ul className="space-y-2.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  <FooterNavLink link={link} />
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-white/[0.05]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-5 text-[11px] text-muted/40 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 KEVAL SOUND. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a href="mailto:privacy@kevalsound.com" className="transition-colors hover:text-light-grey">
              privacy@kevalsound.com
            </a>
            <a href="mailto:support@kevalsound.com" className="transition-colors hover:text-light-grey">
              support@kevalsound.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
