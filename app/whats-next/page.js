import { Card } from "@/components/ui";

export const metadata = { title: "What's next · FarmBiddy" };

/** Roadmap: what FarmBiddy is built to do next. Platform copy only; nothing here runs yet. */
const NEXT = [
  {
    title: "Biddy as the advisor’s copilot",
    text: "Summarise a client before a visit, list the clients at risk this month and draft the text of the advisor report, from the same engine figures.",
    who: "Advisors",
  },
  {
    title: "Documents and invoices",
    text: "Upload co-op statements, invoices and bank exports; FarmBiddy fills the farm’s records so the numbers keep themselves up to date.",
    who: "Farmers",
  },
  {
    title: "Schemes and payments",
    text: "BISS, ACRES and grant payments and deadlines in the cash forecast, with a reminder before each one.",
    who: "Farmers",
  },
  {
    title: "Suppliers and processors",
    text: "Supplier accounts and milk statements straight from the processor, so overdue bills and milk cheques appear on their own.",
    who: "Farmers",
  },
  {
    title: "Alerts and tasks",
    text: "A nudge when the forecast turns overdrawn or a payment is due, and a short list of what to do this week.",
    who: "Farmers and advisors",
  },
  {
    title: "Portfolio benchmarks",
    text: "Each client against the group: cost per litre, margin and loan cover side by side with averages, calculated by the engine.",
    who: "Advisors",
  },
  {
    title: "More farm types",
    text: "Beef, tillage and mixed farms on the same engine, each enterprise on its own and the farm as a whole.",
    who: "Everyone",
  },
  {
    title: "Real accounts",
    text: "Sign-in for farmers, advisors and their teams, with each farm shared only with the people it chooses.",
    who: "Everyone",
  },
];

export default function WhatsNextPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">What’s next</h1>
        <p className="max-w-2xl text-sm text-stone-500">
          Everything in this demo runs on the FarmBiddy Financial Engine today. This is what we are building on top of it.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {NEXT.map((n) => (
          <Card key={n.title} title={n.title} subtitle={n.who}>
            <p className="text-sm text-stone-600">{n.text}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
