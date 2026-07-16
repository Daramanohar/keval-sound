"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";

const SUPPORT_EMAIL = "support@kevalsound.com";

export default function ContactForm() {
  const [isOpeningEmail, setIsOpeningEmail] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();

    if (!name || !email || !message) return;

    setIsOpeningEmail(true);

    const subject = encodeURIComponent(`KEVAL SOUND contact request from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);
    window.location.assign(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`);

    window.setTimeout(() => setIsOpeningEmail(false), 1000);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-5 shadow-2xl shadow-black/20 sm:p-7"
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="contact-name" className="mb-2 block text-sm font-medium text-light-grey">
            Name
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            autoComplete="name"
            maxLength={120}
            required
            className="h-12 w-full rounded-md border border-white/[0.1] bg-vampire-black/70 px-4 text-sm text-white placeholder:text-muted/35 transition-colors hover:border-white/[0.16] focus:border-vivid-blue"
          />
        </div>

        <div>
          <label htmlFor="contact-email" className="mb-2 block text-sm font-medium text-light-grey">
            Email
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            className="h-12 w-full rounded-md border border-white/[0.1] bg-vampire-black/70 px-4 text-sm text-white placeholder:text-muted/35 transition-colors hover:border-white/[0.16] focus:border-vivid-blue"
          />
        </div>

        <div>
          <label htmlFor="contact-message" className="mb-2 block text-sm font-medium text-light-grey">
            Message
          </label>
          <textarea
            id="contact-message"
            name="message"
            rows={7}
            maxLength={5000}
            required
            className="w-full resize-y rounded-md border border-white/[0.1] bg-vampire-black/70 px-4 py-3 text-sm leading-6 text-white placeholder:text-muted/35 transition-colors hover:border-white/[0.16] focus:border-vivid-blue"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isOpeningEmail}
        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-zesty-red px-5 text-sm font-semibold text-white transition-colors hover:bg-zesty-red/85 disabled:cursor-wait disabled:opacity-65"
      >
        <Send aria-hidden="true" className="h-4 w-4" />
        {isOpeningEmail ? "Opening email" : "Send message"}
      </button>
    </form>
  );
}
