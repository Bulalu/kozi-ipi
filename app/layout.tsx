import "./globals.css"
import type { Metadata } from "next"
import { Archivo, Archivo_Black, Geist_Mono, Inter } from "next/font/google"
import { ConvexClientProvider } from "@/components/convex-client-provider"
import { SiteFooter } from "@/components/site-footer"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
})

// Matatu-poster type system: heavy display, workhorse body, mono tags.
const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-archivo-black",
  display: "swap",
})

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
})

const SITE_DESCRIPTION =
  "Tafuta kozi na vyuo Tanzania baada ya Form Four, Form Six au diploma, na angalia sifa zako dhidi ya masharti ya TCU na NACTVET. Find courses and colleges in Tanzania and check your entry requirements."

export const metadata: Metadata = {
  metadataBase: new URL("https://www.koziipi.com"),
  title: {
    default: "Kozi Ipi — Kozi na vyuo Tanzania",
    template: "%s | Kozi Ipi",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Kozi Ipi",
  openGraph: {
    type: "website",
    siteName: "Kozi Ipi",
    locale: "sw_TZ",
    url: "/",
    title: "Kozi Ipi — Kozi na vyuo Tanzania",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/hero-students.png",
        width: 1448,
        height: 1086,
        alt: "Wanafunzi wa Tanzania",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kozi Ipi — Kozi na vyuo Tanzania",
    description: SITE_DESCRIPTION,
    images: ["/hero-students.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${archivo.variable} ${archivoBlack.variable} ${geistMono.variable} font-sans antialiased`}
    >
      <body>
        <ConvexClientProvider>
          <ThemeProvider>
            <div className="flex min-h-screen flex-col">
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  )
}
