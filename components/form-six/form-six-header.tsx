"use client"

import type { FormEvent } from "react"

import { HomeNav } from "@/components/home/home-nav"
import { InfoIcon } from "@/components/home/home-icons"
import { SearchIcon, XIcon } from "@/components/search/search-icons"

export function FormSixHeader({
  indexError,
  indexInput,
  isLoading,
  onInput,
  onReset,
  onSubmit,
  submittedIndex,
}: {
  indexError: string
  indexInput: string
  isLoading: boolean
  onInput: (value: string) => void
  onReset: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  submittedIndex: string
}) {
  return (
    <header className="border-b-[3px] border-kozi-ink bg-kozi-yellow">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-5 pt-5 pb-9 sm:px-10 lg:gap-10 lg:px-14 lg:pt-7 lg:pb-12">
        <HomeNav active="/form-six" />

        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between xl:gap-12">
          <div className="flex min-w-0 flex-col gap-3">
            <p className="font-poster text-lg font-bold text-kozi-ink lg:text-xl">
              Form Six · ACSEE 2026
            </p>
            <h1 className="font-display text-[48px] leading-[0.9] tracking-[-0.05em] text-kozi-ink sm:text-[80px] lg:text-[104px]">
              UNAFUZU KOZI GANI?
            </h1>
            <p className="max-w-[620px] font-poster text-base leading-6 font-medium text-kozi-ink/85 lg:text-lg">
              Weka namba yako ya mtihani. Tutakuonyesha kozi unazofuzu, zile
              zinazokufaa zaidi, na kwa nini nyingine bado hazikufai.
              <span className="mt-1 block text-[15px] text-kozi-ink/65">
                Enter your ACSEE index number to check it against published TCU
                and NACTVET entry requirements.
              </span>
            </p>
          </div>

          <form
            aria-busy={isLoading}
            className="flex w-full shrink-0 flex-col gap-3 lg:max-w-[640px] xl:mb-1.5 xl:w-[560px]"
            noValidate
            onSubmit={onSubmit}
          >
            <div className="flex items-center gap-2 rounded-full border-[3px] border-kozi-ink bg-white py-1.5 pr-1.5 pl-5 shadow-[6px_6px_0_var(--kozi-ink)]">
              <SearchIcon className="size-5 shrink-0 text-kozi-ink" />
              <label htmlFor="form-six-index" className="sr-only">
                Namba ya mtihani wa Form Six (ACSEE index number)
              </label>
              <input
                aria-describedby={
                  indexError ? "form-six-index-error" : "form-six-index-help"
                }
                aria-invalid={Boolean(indexError)}
                autoCapitalize="characters"
                autoComplete="off"
                className="h-12 min-w-0 flex-1 bg-transparent font-tag text-lg font-semibold tracking-[0.04em] text-kozi-ink caret-kozi-cobalt placeholder:font-normal placeholder:text-[#6b6b73] focus:outline-none"
                id="form-six-index"
                inputMode="text"
                onChange={(event) => onInput(event.target.value)}
                placeholder="S0123/0505"
                spellCheck={false}
                value={indexInput}
              />
              {submittedIndex ? (
                <button
                  aria-label="Futa namba"
                  className="grid size-9 shrink-0 place-items-center rounded-full text-kozi-ink/50 transition hover:bg-kozi-ink/5 hover:text-kozi-ink"
                  onClick={onReset}
                  type="button"
                >
                  <XIcon className="size-4" />
                </button>
              ) : null}
              <button
                className="h-12 shrink-0 rounded-full bg-kozi-cobalt px-5 font-display text-sm text-white transition-colors hover:bg-kozi-ink disabled:cursor-wait disabled:opacity-70 lg:px-6 lg:text-base"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? "INATAFUTA…" : "ANGALIA"}
              </button>
            </div>
            {indexError ? (
              <p
                className="font-poster text-sm font-bold text-[#c2261b]"
                id="form-six-index-error"
                role="alert"
              >
                {indexError}
              </p>
            ) : (
              <p
                className="flex items-start gap-2 font-poster text-[13px] leading-5 text-kozi-ink/75"
                id="form-six-index-help"
              >
                <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
                Namba ya shule na ya mtahiniwa, mfano S0123/0505. Inatumika
                kutafuta matokeo yako tu na haiwekwi kwenye link.
              </p>
            )}
          </form>
        </div>
      </div>
    </header>
  )
}
