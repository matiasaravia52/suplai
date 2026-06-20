import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Suplai Admin",
  description: "Panel de administración de Suplai",
}

export default function RootLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  )
}
