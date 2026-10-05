import joeBloggs from "@/data/farms/joe-bloggs.json";
import { getMilkPrice } from "@/lib/market";

/**
 * Platform-owned farm data (one JSON per demo user) and the engine payloads
 * built from it. Builders only move numbers around — no financial maths.
 */

const FARMS = { "joe-bloggs": joeBloggs };

export function getFarm(id = "joe-bloggs") {
  return FARMS[id];
}

/** Engine month is projected if it is after the last actual month. */
export function isProjected(farm, month) {
  return month > farm.actual_through_month;
}

/** pl.months input: every month (actual + budget) and YTD through the last actual month. */
export function buildPlMonthsInput(farm) {
  return {
    months: farm.months.map((m) => ({
      year: farm.year,
      month: m.month,
      ...m.lines,
      ...m.pl,
      milk_price: m.pl.milk_price ?? getMilkPrice(farm.year, m.month),
    })),
    ytd: { year: farm.year, as_of_month: farm.actual_through_month },
  };
}

/**
 * cf.months input. Projected milk cheques are paid the month after supply, so a
 * projected month's `milk` is the engine-published milk revenue of the month before.
 *
 * @param {object} farm
 * @param {import("@/lib/financial-engine/client").PlMonthsResult | null} pl
 * @param {Record<string, number>} [provided] values the farmer just gave for `needs_input`
 */
export function buildCfMonthsInput(farm, pl, provided = {}) {
  const milkByMonth = new Map(pl?.months.map((s) => [s.period.month, s.revenue.milk]) ?? []);
  return {
    ...(farm.opening_cash == null ? {} : { opening_cash: farm.opening_cash }),
    ...provided,
    months: farm.months.map((m) => {
      const milk = m.cash.milk ?? milkByMonth.get(m.month - 1);
      return {
        year: farm.year,
        month: m.month,
        ...m.lines,
        ...m.cash,
        ...(milk == null ? {} : { milk }),
      };
    }),
  };
}
