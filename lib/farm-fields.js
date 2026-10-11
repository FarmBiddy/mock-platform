/**
 * The monthly record fields the farmer can edit on Farm data, grouped as they'd find them, with where to look.
 * [path in a month, label, unit, where to find it]. Milk price is entered in cents per litre (stored €/litre).
 * Pure module: the page, the layout banner and the edit whitelist (farm-edits-core) agree on one list.
 */
export const FIELD_GROUPS = [
  {
    title: "Milk",
    fields: [
      ["pl.milk_litres", "Milk supplied", "litres", "Total litres on your co-op milk statements"],
      ["pl.milk_price", "Milk price", "c/litre", "The price per litre on your statements, before deductions"],
    ],
  },
  {
    title: "Other income",
    fields: [
      ["lines.cattle_sales", "Cattle sales", "€", "Calves, cull cows and stock sold: mart and factory dockets"],
      ["lines.biss", "BISS payment", "€", "Basic Income Support for Sustainability, from your Department letters"],
      ["lines.acres", "ACRES and other schemes", "€", "Scheme payments other than BISS"],
    ],
  },
  {
    title: "Farm costs",
    fields: [
      ["lines.feed", "Feed", "€", "Meal, nuts and bought-in forage: co-op and merchant invoices"],
      ["lines.fertiliser", "Fertiliser and lime", "€", "Fertiliser, lime and reseeding invoices"],
      ["lines.contractor", "Contractors", "€", "Silage, slurry and other contractor bills"],
      ["lines.vet", "Vet and AI", "€", "Vet bills, medicines and AI"],
      ["lines.labour", "Paid labour", "€", "Wages to staff and relief milkers (not your own time)"],
      ["lines.electricity", "Electricity", "€", "Farm electricity bills"],
      ["lines.fuel", "Fuel", "€", "Diesel and petrol used on the farm"],
      ["lines.repairs_maintenance", "Repairs", "€", "Machinery and building repairs and parts"],
      ["lines.insurance", "Insurance", "€", "Farm, stock and machinery insurance"],
      ["lines.rent_lease", "Land rent", "€", "Land you rent or lease in"],
      ["lines.professional_fees", "Accountant and advisor fees", "€", "Accountant, advisor and discussion group fees"],
      ["lines.levies", "Levies", "€", "Co-op and milk levies taken off your statements"],
      ["lines.other_operating_costs", "Anything else for the farm", "€", "Costs that fit nowhere above"],
    ],
  },
  {
    title: "Household",
    fields: [["cash.household_drawings", "Money taken for the house", "€", "Drawings for the family and household"]],
  },
];

export const FIELDS = FIELD_GROUPS.flatMap((g) => g.fields);
/** Cents on screen, €/litre in the farm file. */
export const CENTS = new Set(["pl.milk_price"]);
/** The milk cheque: follows litres × price unless the farmer gives their own (shown on its own, folded away). */
export const CHEQUE = ["cash.milk", "Milk cheques received", "€", "What the co-op actually paid in (the month after supply)"];

/** Has the farmer given their own figure for this field (a year total or any month)? */
export const ownFigure = (edits, path) => `months_scale.${path}` in edits || `months_total.${path}` in edits || Object.keys(edits).some((p) => p.startsWith("months.") && p.endsWith(`.${path}`));

/** Has the farm any records yet? Milk is the one figure every page needs; a new farmer has none until they add it. */
export const hasRecords = (farm) => farm.months.some((m) => (m.pl?.milk_litres ?? 0) > 0);
