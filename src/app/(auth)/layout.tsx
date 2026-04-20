import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-surface px-4 py-16">
      <Link
        href="/"
        className="font-display text-2xl font-semibold lowercase tracking-tight text-on-surface"
      >
        kinetic gallery
      </Link>
      {children}
    </div>
  )
}
