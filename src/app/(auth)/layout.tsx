import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Editorial side */}
      <div className="relative hidden flex-col items-start justify-end overflow-hidden bg-surface-lowest p-20 pb-24 lg:flex lg:w-3/5 xl:w-2/3">
        {/* Gradient glow decorations */}
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] animate-blob-a rounded-full bg-primary-container/40 blur-3xl" />
        <div className="absolute top-1/3 left-1/4 h-[400px] w-[400px] animate-blob-b rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-lowest via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-surface-lowest/60 via-transparent to-transparent" />

        {/* Content */}
        <div className="relative z-10 max-w-xl">
          <h1 className="mb-6 font-display text-8xl leading-none font-black tracking-tighter text-on-surface lowercase">
            pole
            <br />
            <span className="text-primary">space</span>
          </h1>
          <p className="max-w-sm text-lg leading-relaxed text-on-surface-variant">
            transform movement into art. access the world&rsquo;s most technical library of pole
            performance.
          </p>
          <div className="mt-10 flex items-center gap-6">
            <div className="h-px w-20 bg-primary-container/40" />
            <span className="text-[10px] tracking-widest text-primary/50 uppercase">
              curated technical excellence
            </span>
          </div>
        </div>

        {/* Decorative vertical bars */}
        <div className="absolute top-8 right-8 flex gap-1.5 opacity-20 mix-blend-overlay">
          <div className="h-8 w-0.5 bg-primary" />
          <div className="h-4 w-0.5 bg-primary" />
          <div className="h-12 w-0.5 bg-primary" />
        </div>
      </div>

      {/* Form side */}
      <main className="relative flex w-full flex-col items-center justify-center overflow-y-auto bg-surface px-8 py-16 sm:px-16 lg:w-2/5 xl:w-1/3">
        {/* Mobile brand */}
        <div className="absolute top-10 left-8 lg:hidden">
          <Link
            href="/"
            className="font-display text-xl font-bold tracking-tight text-on-surface lowercase"
          >
            pole space
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}
