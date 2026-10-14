import "./globals.css"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
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
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
