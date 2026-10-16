import type { Metadata } from "next"

const SHARE_IMAGE = {
  url: "/hero-students.png",
  width: 1448,
  height: 1086,
  alt: "Wanafunzi wa Tanzania",
}

// Per-page metadata. Next.js replaces `openGraph` as a whole when a page
// sets it, so each page repeats the site name and share image here.
export function pageMetadata({
  description,
  path,
  title,
  absoluteTitle = false,
}: {
  description: string
  path: string
  title: string
  // Use the title as is instead of the "%s | Kozi Ipi" template.
  absoluteTitle?: boolean
}): Metadata {
  const shareTitle = absoluteTitle ? title : `${title} | Kozi Ipi`
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: "Kozi Ipi",
      locale: "sw_TZ",
      url: path,
      title: shareTitle,
      description,
      images: [SHARE_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description,
      images: [SHARE_IMAGE.url],
    },
  }
}
