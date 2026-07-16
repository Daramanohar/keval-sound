import type { Metadata } from "next";
import { Building2, Landmark, Mail, MapPin } from "lucide-react";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact Us | KEVAL SOUND",
  description: "Contact KEVAL SOUND for privacy, support, and payment-related questions.",
};

const businessDetails = [
  {
    label: "Registered business name",
    value: "KEVAL SOUND",
    icon: Building2,
  },
  {
    label: "Business address",
    value: "1ST CROSS, HORAPET, AZAD NAGAR, CHITRADURGA, KARNATAKA, 577501",
    icon: MapPin,
  },
  {
    label: "GSTIN",
    value: "29ACWPZ8257G1ZD",
    icon: Landmark,
  },
] as const;

export default function ContactPage() {
  return (
    <div className="relative overflow-hidden bg-vampire-black">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-zesty-red via-dandelion to-transparent" />

      <section className="border-b border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
          <p className="text-xs font-semibold uppercase text-dandelion">KEVAL SOUND support</p>
          <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">Contact Us</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted/75">
            For privacy questions, requests, or complaints, contact:
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:py-16">
        <div>
          <dl className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
            {businessDetails.map(({ label, value, icon: Icon }) => (
              <div key={label} className="grid gap-3 py-5 sm:grid-cols-[170px_1fr]">
                <dt className="flex items-center gap-2 text-sm font-medium text-muted/65">
                  <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-zesty-red" />
                  {label}
                </dt>
                <dd className="text-sm font-medium leading-6 text-light-grey">{value}</dd>
              </div>
            ))}

            <div className="grid gap-3 py-5 sm:grid-cols-[170px_1fr]">
              <dt className="flex items-center gap-2 text-sm font-medium text-muted/65">
                <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-zesty-red" />
                Privacy email
              </dt>
              <dd>
                <a href="mailto:privacy@kevalsound.com" className="text-sm font-medium text-dandelion hover:underline">
                  privacy@kevalsound.com
                </a>
              </dd>
            </div>

            <div className="grid gap-3 py-5 sm:grid-cols-[170px_1fr]">
              <dt className="flex items-center gap-2 text-sm font-medium text-muted/65">
                <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-zesty-red" />
                Support email
              </dt>
              <dd>
                <a href="mailto:support@kevalsound.com" className="text-sm font-medium text-dandelion hover:underline">
                  support@kevalsound.com
                </a>
              </dd>
            </div>
          </dl>

          <p className="mt-8 max-w-xl text-sm leading-7 text-muted/65">
            For payment-related issues, users should contact KEVAL SOUND support first. Payment processing may also involve Stripe, banks, card networks, or payment method providers according to their own rules and privacy practices.
          </p>
        </div>

        <ContactForm />
      </section>
    </div>
  );
}
