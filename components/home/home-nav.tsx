import Link from "next/link"

import { MenuIcon } from "@/components/home/home-icons"

const NAV_LINKS = [
  { label: "Kozi", href: "/search" },
  { label: "Vyuo", href: "/vyuo" },
  { label: "Form Six", href: "/form-six" },
  { label: "Takwimu", href: "/analytics" },
]

const pill =
  "rounded-full border-2 border-kozi-ink px-4 py-2 text-sm font-bold text-kozi-ink transition-colors hover:bg-kozi-ink hover:text-kozi-yellow"

export function HomeNav() {
  return (
    <header className="relative z-30 flex items-center justify-between gap-6">
      <Link
        href="/"
        aria-label="Kozi Ipi home"
        className="font-display text-[22px] tracking-[-0.02em] text-kozi-ink sm:text-[26px]"
      >
        KOZI IPI★
      </Link>

      <nav className="hidden items-center gap-2 font-poster md:flex">
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={pill}>
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
