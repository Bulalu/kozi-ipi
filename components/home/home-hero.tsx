import Image from "next/image"
import Link from "next/link"

import { HOME_STATS } from "@/components/home/home-content"
import { ArrowRightIcon } from "@/components/home/home-icons"
import { HomeNav } from "@/components/home/home-nav"

export function HomeHero() {
  return (
    <section className="relative overflow-hidden bg-kozi-yellow lg:min-h-[900px]">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col px-5 pt-5 sm:px-10 lg:px-14 lg:pt-7">
        <HomeNav />

        <h1 className="relative z-10 mt-6 flex flex-col text-kozi-ink lg:mt-4">
          <span className="pl-1 font-poster text-lg font-bold lg:text-[22px]">
            Oyaaa,
          </span>
          <span className="font-display text-[128px] leading-[0.84] tracking-[-0.06em] sm:text-[180px] lg:text-[240px]">
            KOZI
          </span>
          <span className="font-display text-[128px] leading-[0.84] tracking-[-0.06em] sm:text-[180px] lg:text-[240px]">
            IPI?
          </span>
          <span className="sr-only">Unachukua kozi ipi?</span>
        </h1>

        <Sticker className="absolute top-[190px] right-5 z-20 size-24 text-[17px] sm:top-[240px] sm:right-10 sm:size-32 sm:text-2xl lg:top-[390px] lg:right-auto lg:left-[545px] lg:size-[150px] lg:text-[30px]" />

        <Link
          href="/form-six"
          className="absolute top-[132px] right-[72px] z-20 hidden rotate-[4deg] items-center gap-2.5 border-[3px] border-kozi-ink bg-white px-5 py-3.5 shadow-[5px_5px_0_var(--kozi-ink)] transition-transform hover:rotate-[2deg] lg:flex"
        >
          <span className="font-display text-[15px] text-kozi-ink">
            ACSEE IMETOKA?
          </span>
          <span className="font-poster text-[15px] font-bold text-kozi-cobalt">
            Weka index →
          </span>
        </Link>

        <div className="relative -mx-5 -mt-2 h-[300px] sm:h-[420px] lg:absolute lg:right-[-40px] lg:bottom-[-30px] lg:mx-0 lg:mt-0 lg:h-[675px] lg:w-[900px]">
          <Image
            src="/home/students-cutout.png"
            alt="Three Tanzanian students looking ahead, in blue and yellow"
            fill
            priority
            sizes="(min-width: 1024px) 900px, 100vw"
            className="object-contain object-bottom"
          />
        </div>

        <div className="relative z-10 -mt-7 flex flex-col gap-4 pb-7 lg:absolute lg:bottom-14 lg:left-14 lg:mt-0 lg:w-[560px] lg:pb-0">
          <p className="hidden max-w-[500px] font-poster text-[19px] leading-7 font-medium text-kozi-ink lg:block">
            Kozi {HOME_STATS.programmes} · vyuo {HOME_STATS.institutions} · kwa
            Form Four, Form Six na Diploma. Chagua smart.
          </p>

          <form
            action="/search"
            method="get"
            className="flex items-center gap-2 rounded-full border-[3px] border-kozi-ink bg-white py-1.5 pr-1.5 pl-5 shadow-[6px_6px_0_var(--kozi-ink)] lg:pl-6"
          >
            <label htmlFor="home-search" className="sr-only">
              Tafuta kozi, chuo, au ndoto yako
            </label>
            <input
              id="home-search"
              name="q"
              type="search"
              placeholder="Nataka kusomea..."
              className="h-12 min-w-0 flex-1 bg-transparent font-poster text-base text-kozi-ink placeholder:text-[#6b6b73] focus:outline-none lg:text-[17px]"
            />
            <button
              type="submit"
              className="h-12 shrink-0 rounded-full bg-kozi-cobalt px-5 font-display text-sm text-white transition-colors hover:bg-kozi-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kozi-ink lg:h-[52px] lg:px-6 lg:text-base"
            >
              TAFUTA
            </button>
          </form>

          <Link
            href="/form-six"
            className="flex items-center justify-center gap-2 rounded-2xl bg-kozi-ink px-4 py-3.5 font-display text-sm text-kozi-yellow lg:hidden"
          >
            ACSEE IMETOKA? WEKA INDEX
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function Sticker({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`grid -rotate-12 place-items-center rounded-full border-[3px] border-kozi-ink bg-kozi-cobalt text-center font-display leading-none text-white ${className}`}
    >
      <span>
        BURE
        <br />
        KABISA!
      </span>
    </div>
  )
}
