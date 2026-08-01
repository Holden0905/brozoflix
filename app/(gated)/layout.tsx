import Link from "next/link";
import { NavLinks } from "@/components/nav-links";
import { RegisterServiceWorker } from "@/components/register-sw";

export default function GatedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-screen-2xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="font-display text-2xl uppercase leading-none tracking-wide focus-visible:outline-2 focus-visible:outline-offset-4"
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
