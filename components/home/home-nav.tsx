import Link from "next/link"

import { MenuIcon } from "@/components/home/home-icons"

const NAV_LINKS = [
  { label: "Kozi", href: "/search" },
  { label: "Vyuo", href: "/vyuo" },
  { label: "Form Six", href: "/form-six" },
  { label: "Takwimu", href: "/analytics" },
]

const pill =
  "rounded-full border-2 border-kozi-ink px-4 py-2 text-sm font-bold transition-colors hover:bg-kozi-ink hover:text-kozi-yellow"

// Shared poster nav. `active` is the href of the current section, if any.
export function HomeNav({ active }: { active?: string } = {}) {
  return (
    <header className="relative z-30 flex items-center justify-between gap-6">
      {/* Star mark only: every page already carries the name in its
          headline or footer, so a full wordmark here was redundant. */}
      <Link
        href="/"
        aria-label="Kozi Ipi home"
        className="grid size-11 shrink-0 place-items-center rounded-full bg-kozi-ink text-kozi-yellow transition-transform hover:-rotate-12 sm:size-12"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="size-6"
          fill="currentColor"
        >
          <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
        </svg>
      </Link>

      <nav className="hidden items-center gap-2 font-poster md:flex">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active === link.href ? "page" : undefined}
            className={`${pill} ${
              active === link.href
                ? "bg-kozi-ink text-kozi-yellow"
                : "text-kozi-ink"
            }`}
          >
            {link.label}
          </Link>
        ))}
        <Link
          href="/eligibility"
          className="rounded-full bg-kozi-ink px-4 py-2 text-sm font-bold text-kozi-yellow transition-transform hover:-translate-y-0.5"
        >
          Angalia sifa →
        </Link>
      </nav>

      {/* Mobile menu: native <details> keeps this a server component. */}
      <details className="group relative md:hidden">
        <summary
          aria-label="Fungua menyu"
          className="grid size-11 cursor-pointer list-none place-items-center rounded-full bg-kozi-ink text-kozi-yellow [&::-webkit-details-marker]:hidden"
        >
          <MenuIcon className="size-5" />
        </summary>
        <nav className="absolute top-14 right-0 flex w-56 flex-col gap-1 rounded-2xl border-[3px] border-kozi-ink bg-white p-2 font-poster shadow-[5px_5px_0_var(--kozi-ink)]">
          {[
            ...NAV_LINKS,
            { label: "Angalia sifa zangu", href: "/eligibility" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl px-4 py-3 text-base font-bold text-kozi-ink hover:bg-kozi-yellow"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </details>
    </header>
  )
}
