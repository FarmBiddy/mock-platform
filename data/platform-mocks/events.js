/**
 * Platform-only mock upcoming financial events.
 * NEVER sent to the Financial Engine.
 */
export const MOCK_EVENTS = [
  { id: "evt-biss", title: "BISS payment expected", dateLabel: "15 Oct", kind: "income" },
  { id: "evt-loan", title: "Machinery loan instalment", dateLabel: "1 Nov", kind: "outgo" },
  { id: "evt-levy", title: "Dairy levy remittance", dateLabel: "20 Nov", kind: "outgo" },
];
