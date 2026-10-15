"use client"

import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"

import { ArrowRightIcon, InfoIcon } from "@/components/home/home-icons"
import {
  formatAcseeIndexNumber,
  isPlausibleAcseeIndexNumber,
  normalizeAcseeIndexNumber,
} from "@/lib/necta/acsee"
import { formSixHandoffHref, stripExamYear } from "@/lib/necta/index-handoff"

// Validates the index here, then hands it to /form-six in the URL fragment.
// Without JavaScript the form still GETs /form-six?index=…, which that page reads.
export function IndexCheckForm() {
  const router = useRouter()
  const [value, setValue] = useState("")
  const [error, setError] = useState("")

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const candidate = stripExamYear(value)

    if (!isPlausibleAcseeIndexNumber(normalizeAcseeIndexNumber(candidate))) {
      setError("Weka namba kamili, mfano S0123/0045.")
      return
    }

    setError("")
    router.push(formSixHandoffHref(formatAcseeIndexNumber(candidate)))
  }

  return (
    <form
      action="/form-six"
      method="get"
      noValidate
      onSubmit={submit}
      className="flex w-full max-w-[520px] shrink-0 flex-col gap-5 rounded-[20px] border-[3px] border-kozi-ink bg-white p-6 shadow-[10px_10px_0_var(--kozi-ink)] lg:rotate-[1.5deg] lg:p-9"
    >
      <label
        htmlFor="home-index"
        className="font-poster text-[15px] font-bold text-kozi-ink"
      >
        Namba ya mtihani (ACSEE)
      </label>
      <input
        id="home-index"
        name="index"
        inputMode="text"
        autoComplete="off"
        placeholder="S0123/0045"
        value={value}
        onChange={(event) => {
          setValue(event.target.value)
          if (error) setError("")
        }}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "home-index-error" : undefined}
        className="h-16 rounded-[14px] border-[3px] border-kozi-ink bg-[#fff8d6] px-5 font-tag text-[22px] font-semibold tracking-[0.04em] text-kozi-ink placeholder:text-kozi-ink/35 focus:outline-none focus-visible:ring-4 focus-visible:ring-kozi-yellow aria-invalid:border-[#c2261b]"
      />
      {error ? (
        <p
          id="home-index-error"
          role="alert"
          className="-mt-2 font-poster text-sm font-semibold text-[#c2261b]"
        >
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        className="flex h-16 items-center justify-center gap-2.5 rounded-full border-[3px] border-kozi-ink bg-kozi-cobalt font-display text-[15px] text-white shadow-[4px_4px_0_var(--kozi-ink)] transition-transform hover:-translate-y-0.5 sm:text-[17px]"
      >
        NIONYESHE KOZI ZANGU
        <ArrowRightIcon className="size-[18px]" />
      </button>
      <p className="flex items-start gap-2 font-poster text-[13px] leading-[1.45] text-kozi-graphite">
        <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
        Ni mwongozo, si barua ya udahili — thibitisha na TCU au NACTVET.
      </p>
    </form>
  )
}
