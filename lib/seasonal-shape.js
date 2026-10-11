/**
 * A typical spring-calving year, as % of the year falling in each month (Jan..Dec) per Farm data field.
 * Used only to spread a year total over the months when a farm has no months of its own yet (a new farmer);
 * a farm with records keeps its own shape. Taken once from the demo farm's 2025 records; not anyone's statistics.
 */
export const SEASONAL_SHAPE = {
  "pl.milk_litres": [1, 4.7, 10.5, 13.2, 14.6, 13.6, 11.9, 10.5, 8.8, 6.8, 3.7, 0.7],
  "cash.milk": [1.1, 1, 4.6, 10.4, 13.4, 14.5, 13.2, 11.5, 10.4, 8.9, 7, 3.9],
  "cash.household_drawings": [8.3, 8.3, 8.3, 8.3, 8.3, 8.3, 8.3, 8.3, 8.3, 8.3, 8.3, 8.3],
  "lines.feed": [13.7, 12.9, 9.9, 5.8, 3.9, 3.6, 4.3, 4.9, 6.4, 9.1, 12.2, 13.4],
  "lines.fertiliser": [0, 0, 23.1, 26.7, 21.5, 14.4, 8.2, 6.1, 0, 0, 0, 0],
  "lines.vet": [6.1, 24.6, 18.5, 9.2, 5.1, 4.7, 4.1, 4.4, 5.1, 6.1, 7.2, 5.1],
  "lines.contractor": [0, 0, 0, 0, 19.4, 54.9, 0, 25.8, 0, 0, 0, 0],
  "lines.labour": [7.4, 10.1, 10.1, 9, 8.5, 8.5, 7.9, 7.9, 7.9, 7.9, 7.4, 7.4],
  "lines.electricity": [7.6, 8.2, 8.8, 9.1, 9.3, 8.9, 8.6, 8.3, 8.2, 7.8, 7.6, 7.6],
  "lines.fuel": [7.3, 7.8, 8.3, 8.9, 9.5, 10.8, 8.9, 8.5, 7.9, 7.8, 7.3, 7.3],
  "lines.repairs_maintenance": [9.6, 0, 0, 0, 28.5, 0, 61.9, 0, 0, 0, 0, 0],
  "lines.insurance": [0, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "lines.rent_lease": [0, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "lines.professional_fees": [0, 0, 0, 55.7, 0, 0, 0, 0, 0, 0, 44.3, 0],
  "lines.levies": [1.2, 5, 10.4, 12.9, 14.5, 13.7, 12, 10.4, 8.7, 7.1, 3.7, 0.4],
  "lines.other_operating_costs": [0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0],
  "lines.cattle_sales": [0, 5.4, 21.7, 16.3, 0, 0, 0, 0, 11.3, 27.2, 18.1, 0],
  "lines.biss": [0, 0, 0, 0, 0, 0, 0, 0, 0, 70, 0, 30],
  "lines.acres": [0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 0, 0],
};
