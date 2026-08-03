import Link from "next/link";
import { NavLinks } from "@/components/nav-links";
import { RegisterServiceWorker } from "@/components/register-sw";

export default function GatedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col pt-safe pb-safe">
      <header className="border-b border-border">
        {/* Four nav items plus the wordmark overflow a 375px screen, so the
            header is allowed to wrap to two lines there and locks back to a
            single 56px row from sm up. */}
        <div className="mx-auto flex min-h-14 w-full max-w-screen-2xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 sm:h-14 sm:flex-nowrap sm:px-6 sm:py-0">
          <Link
            href="/"
            className="shrink-0 font-display text-2xl uppercase leading-none tracking-wide focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            Brozoflix
          </Link>
          <NavLinks />
        </div>
      </header>
      <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 pb-16 sm:px-6">
        {children}
      </main>
      <RegisterServiceWorker />
    </div>
  );
}
