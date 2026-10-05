/**
 * Market price adapter (mock). The platform owns prices and passes them to the
 * engine as inputs. Swap the body for a real feed (co-op / Ornua PPI) later.
 *
 * @param {number} _year
 * @param {number} _month
 * @returns {number} EUR per litre
 */
export function getMilkPrice(_year, _month) {
  return 0.48;
}
