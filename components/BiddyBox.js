import Link from "next/link";

/** "Ask Biddy" box with starter questions; each opens a new chat (native GET form, no client JS). */
export default function BiddyBox({ placeholder, questions }) {
  return (
    <section className="rounded-2xl bg-[#173a2b] p-5 text-white shadow-sm">
      <form action="/chat" className="flex gap-2 rounded-full bg-white p-1.5">
        <input
          name="q"
          required
          maxLength={1000}
          placeholder={placeholder}
          aria-label="Ask Biddy"
          className="min-w-0 flex-1 bg-transparent px-3 text-sm text-stone-900 outline-none"
        />
        <button className="rounded-full bg-emerald-800 px-4 py-1.5 text-sm font-medium hover:bg-emerald-900">Ask</button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {questions.map((q) => (
          <Link key={q} href={`/chat?q=${encodeURIComponent(q)}`} className="rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/20">
            {q}
          </Link>
        ))}
      </div>
    </section>
  );
}
