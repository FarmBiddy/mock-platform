/** What-if presets the farmer can tick. Shocks use the engine's risk.sensitivity vocabulary. */
export const WHAT_IF_PRESETS = [
  { id: "milk-5", label: "Milk −5c/L", shock: { milk_price_c: -5 } },
  { id: "milk-10", label: "Milk −10c/L", shock: { milk_price_c: -10 } },
  { id: "feed+10", label: "Feed +10%", shock: { lines_pct: { feed: 10 } } },
  { id: "fert+20", label: "Fertiliser +20%", shock: { lines_pct: { fertiliser: 20 } } },
  { id: "herd-10", label: "10% fewer cows", shock: { herd_pct: -10 } },
];
