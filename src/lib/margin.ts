// Margin is always derived from unitPrice/unitCost, never stored — a
// catalog item's cost is optional (most historically never tracked one),
// so both return null rather than a misleading 0 when cost isn't set.
export function marginAmount(unitPrice: number, unitCost: number | null): number | null {
  if (unitCost === null) return null;
  return unitPrice - unitCost;
}

export function marginPercent(unitPrice: number, unitCost: number | null): number | null {
  if (unitCost === null || unitPrice <= 0) return null;
  return ((unitPrice - unitCost) / unitPrice) * 100;
}
