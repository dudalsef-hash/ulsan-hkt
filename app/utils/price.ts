export function calculateTotalPrice(items: { price: number; quantity: number }[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function calculatePerPersonPrice(totalPrice: number, people: number): number {
  if (people <= 0) return 0;
  return Math.ceil(totalPrice / people);
}

export function calculateSplitAmounts(totalPrice: number, people: number): number[] {
  if (people <= 0) return [];
  const base = Math.floor(totalPrice / people);
  const remainder = totalPrice % people;
  return Array.from({ length: people }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function formatPrice(price: number, currency: string = "¥"): string {
  return `${currency}${price.toLocaleString()}`;
}
