import ShortenForm from "@/components/ShortenForm";

export default function Home() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Shorten a link
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Paste a long URL, pick an alias if you like, and get a short link with
        click tracking.
      </p>
      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <ShortenForm />
      </div>
    </div>
  );
}
