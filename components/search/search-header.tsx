"use client"

import Image from "next/image"
import Link from "next/link"
import { type FormEvent, useState } from "react"

import { trendingQueries } from "@/components/search/search-config"
import { SearchIcon, XIcon } from "@/components/search/search-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type SearchHeaderProps = {
  initialQuery: string
  onSubmit: (query: string) => void
  onTrending: (query: string) => void
}

export function SearchHeader({
  initialQuery,
  onSubmit,
  onTrending,
}: SearchHeaderProps) {
  const [query, setQuery] = useState(initialQuery)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(query)
  }
  return (
    <>
      <header className="border-b border-brand-ink/8">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-6 px-6 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-3"
            aria-label="Kozi Ipi home"
          >
            <Image
              src="/kozi-ipi-logo.png"
              alt="Kozi Ipi"
              width={36}
              height={36}
              priority
              className="size-9"
            />
            <span className="text-[15px] font-semibold tracking-tight">
              Kozi Ipi
            </span>
            <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-brand-blue uppercase">
              Beta
            </span>
          </Link>

          <nav className="flex items-center gap-5 text-[13.5px] font-medium text-brand-ink/70 md:gap-7">
            <Link href="/search" className="text-brand-ink">
              Kozi
            </Link>
            <Link href="/vyuo" className="transition hover:text-brand-blue">
              Vyuo
            </Link>
            <Link
              href="/eligibility"
              className="transition hover:text-brand-blue"
            >
              Sifa
            </Link>
          </nav>

          <Link
            href="/search"
            aria-label="Search programmes"
            className="grid size-10 place-items-center rounded-full text-brand-ink transition-colors hover:bg-brand-ink/5 md:hidden"
          >
            <SearchIcon className="size-[18px]" />
          </Link>
        </div>
      </header>

      <section className="border-b border-brand-ink/8 bg-[#fbfbfb]">
        <div className="mx-auto max-w-[1280px] px-6 py-7 sm:px-8">
          <div className="flex items-center gap-3 text-[12px] tracking-[0.18em] text-brand-blue uppercase">
            <span className="font-semibold">Search</span>
            <span className="h-px flex-1 bg-brand-blue/20" />
          </div>

          <h1 className="mt-3 max-w-3xl text-[34px] leading-[1.1] font-bold tracking-tight">
            Tafuta kozi na njia inayokufaa.
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-brand-ink/65">
            fahamu kozi, vyuo, na njia za kujiunga kulingana na elimu uliyonayo.
          </p>

          <form
            className="mt-6 flex w-full max-w-3xl flex-col gap-2 rounded-3xl border border-brand-ink/10 bg-white p-2 shadow-[0_18px_38px_-22px_rgba(15,15,18,0.25)] sm:flex-row sm:items-center sm:rounded-full"
            onSubmit={handleSubmit}
          >
            <label className="flex flex-1 items-center gap-3 px-4">
              <span className="sr-only">Tafuta kozi, chuo, career path</span>
              <SearchIcon className="size-[18px] shrink-0 text-brand-ink/55" />
              <Input
                aria-label="Tafuta kozi, chuo, career path"
                className="h-12 min-w-0 flex-1 border-0 bg-transparent px-0 text-[15px] text-brand-ink caret-brand-blue shadow-none placeholder:text-brand-ink/40 focus-visible:ring-0"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tafuta kozi, chuo, career path..."
                size="xl"
                variant="ghost"
                value={query}
              />
              {query ? (
                <button
                  className="grid size-7 place-items-center rounded-full text-brand-ink/40 transition hover:bg-brand-ink/5 hover:text-brand-ink"
                  onClick={() => setQuery("")}
                  type="button"
                  aria-label="Clear search"
                >
                  <XIcon className="size-4" />
                </button>
              ) : null}
            </label>
            <Button
              className="h-12 shrink-0 rounded-full bg-brand-blue px-7 text-[14px] font-semibold text-white transition hover:bg-brand-blue-deep"
              type="submit"
            >
              Tafuta
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-[12.5px]">
            <span className="font-semibold text-brand-ink/60">Trending:</span>
            {trendingQueries.map((trending) => (
              <button
                className="rounded-full border border-brand-ink/15 bg-white px-3 py-1.5 text-brand-ink/70 transition hover:border-brand-blue hover:bg-brand-blue hover:text-white"
                key={trending}
                onClick={() => {
                  setQuery(trending)
                  onTrending(trending)
                }}
                type="button"
              >
                {trending}
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
