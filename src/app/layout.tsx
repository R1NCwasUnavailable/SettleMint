import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SettleMint',
  description: 'AI-powered accountant for group trips',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
