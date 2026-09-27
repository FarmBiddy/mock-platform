import { MOCK_EVENTS } from "@/data/platform-mocks/events";

/** Platform mock — not from Financial Engine. */
export default function UpcomingEvents() {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-stone-900">
          Upcoming financial events
        </h2>
        <span className="text-[10px] uppercase tracking-wider text-stone-400">
          Platform mock
        </span>
      </div>
      <ul className="space-y-2">
        {MOCK_EVENTS.map((event) => (
          <li
            key={event.id}
            className="flex items-center justify-between gap-3 rounded border border-stone-200 bg-white px-4 py-3 text-sm"
          >
            <div>
              <p className="font-medium text-stone-900">{event.title}</p>
              <p className="text-xs capitalize text-stone-500">{event.kind}</p>
            </div>
            <p className="shrink-0 text-xs font-medium text-stone-600">
              {event.dateLabel}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
