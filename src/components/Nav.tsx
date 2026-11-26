import Link from "next/link";

export default function Nav() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold tracking-tight">
          short<span className="text-zinc-400">.link</span>
        </Link>
        <div className="flex gap-5 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Shorten
          </Link>
          <Link href="/stats" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Stats
          </Link>
        </div>
      </nav>
    </header>
  );
}
