import Link from "next/link";

/** Plain, readable layout for the public legal pages. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="bg-peach px-5 pt-8 pb-10 sm:rounded-b-[38px]">
        <div className="mx-auto max-w-[720px]">
          <Link href="/" className="mb-6 inline-flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-coral font-display text-xl font-extrabold text-white">S</span>
            <span className="font-display text-xl font-extrabold tracking-[-0.03em]">Staffbook</span>
          </Link>
          <h1 className="font-display text-[36px] font-extrabold leading-tight tracking-[-0.04em]">{title}</h1>
          <p className="mt-1 text-sm font-semibold text-muted">Last updated {updated}</p>
        </div>
      </header>
      <main className="mx-auto max-w-[720px] px-5 py-8 text-[15px] leading-relaxed [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-extrabold [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3 [&_ul]:mb-3">
        {children}
      </main>
    </div>
  );
}
