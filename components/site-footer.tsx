import Link from "next/link"

const FOOTER_COLUMNS = [
  {
    title: "Gundua",
    links: [
      { label: "Kozi", href: "/search" },
      { label: "Vyuo", href: "/vyuo" },
      { label: "Takwimu", href: "/analytics" },
    ],
  },
  {
    title: "Sifa",
    links: [
      { label: "Form Four", href: "/eligibility" },
      { label: "Form Six", href: "/form-six" },
      { label: "Diploma", href: "/search?level=degree" },
    ],
  },
  {
    title: "Kozi Ipi",
    links: [
      {
        label: "GitHub",
        href: "https://github.com/Bulalu/kozi-ipi",
        external: true,
      },
      {
        label: "Changia",
        href: "https://github.com/Bulalu/kozi-ipi/blob/master/CONTRIBUTING.md",
        external: true,
      },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="overflow-hidden bg-kozi-ink text-white">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-14 px-5 pt-16 pb-9 sm:px-10 lg:gap-[72px] lg:px-14 lg:pt-[88px]">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex max-w-[480px] flex-col gap-5">
            <p className="font-display text-[32px] leading-[1.05] tracking-[-0.03em] lg:text-[40px]">
              CHAGUA SMART. JENGA KESHO YAKO.
            </p>
            <p className="font-poster text-[15px] leading-[1.55] text-white/60">
              Data kutoka miongozo ya udahili ya TCU na NACTVET.
            </p>
          </div>

          <nav className="grid grid-cols-3 gap-8 font-poster lg:flex lg:gap-[72px]">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title} className="flex flex-col gap-3.5">
                <span className="font-display text-[13px] tracking-[0.06em] text-kozi-yellow uppercase">
                  {column.title}
                </span>
                {column.links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    target={"external" in link ? "_blank" : undefined}
                    rel={"external" in link ? "noreferrer" : undefined}
                    className="text-base font-medium text-white transition-colors hover:text-kozi-yellow"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div className="flex items-end justify-between gap-6">
          <Link
            href="/"
            aria-label="Kozi Ipi home"
            className="font-display text-[84px] leading-[0.8] tracking-[-0.06em] whitespace-nowrap text-kozi-yellow sm:text-[150px] lg:text-[236px]"
          >
            KOZI IPI
          </Link>
          <span
            aria-hidden
            className="hidden size-[150px] shrink-0 -rotate-12 place-items-center rounded-full border-[3px] border-white bg-kozi-cobalt text-center font-display text-[22px] leading-6 sm:grid"
          >
            MADE IN
            <br />
            TZ ★
          </span>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/15 pt-5 font-poster text-[13px] text-white/50 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Kozi Ipi</p>
          <p>Ni mwongozo — thibitisha sifa na TCU / NACTVET kabla ya kuomba.</p>
        </div>
      </div>
    </footer>
  )
}
