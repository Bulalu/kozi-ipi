// Hand-off of an ACSEE index number from the home page to /form-six.
// The number travels in the URL fragment (#index=…) so it never reaches
// server or CDN logs; `?index=` is still read as a no-JavaScript fallback.

const HANDOFF_PARAM = "index"

// Students often copy the exam year from their certificate
// ("S0123/0045/2025"), but lookups use the school/candidate pair only.
export function stripExamYear(value: string) {
  const trimmed = value.trim()
  const compact = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, "")

  if (/^[A-Z]\d{8}(19|20)\d{2}$/.test(compact)) {
    return `${compact.slice(0, 5)}/${compact.slice(5, 9)}`
  }

  return trimmed
}

export function formSixHandoffHref(indexNumber: string) {
  return `/form-six#${HANDOFF_PARAM}=${encodeURIComponent(indexNumber)}`
}

export function readIndexHandoff() {
  const fromHash = new URLSearchParams(window.location.hash.slice(1)).get(
    HANDOFF_PARAM
  )
  const fromQuery = new URLSearchParams(window.location.search).get(
    HANDOFF_PARAM
  )

  return fromHash ?? fromQuery
}

// Drop the index from the address bar so it isn't kept in history or shared links.
export function clearIndexHandoff() {
  window.history.replaceState(null, "", window.location.pathname)
}
