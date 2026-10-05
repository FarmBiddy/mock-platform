import { notFound } from "next/navigation";
import { NAV } from "@/components/shell/nav";

export default async function SectionPage({ params }) {
  const { section } = await params;
  const item = NAV.find(([, href]) => href === `/${section}`);
  if (!item) notFound();

  return (
    <div className="p-6">
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">{item[0]}</h1>
        <p className="mt-2 text-sm text-stone-500">Coming soon in the mock platform.</p>
      </div>
    </div>
  );
}
