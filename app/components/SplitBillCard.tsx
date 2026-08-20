import { SplitIcon } from "./Icons";
import { calculateSplitAmounts, formatPrice } from "../utils/price";

interface SplitBillCardProps {
  totalPrice: number;
  people: number;
}

export function SplitBillCard({ totalPrice, people }: SplitBillCardProps) {
  const amounts = calculateSplitAmounts(totalPrice, people);

  return (
    <section className="split-bill" aria-label="더치페이">
      <div className="split-bill__header">
        <SplitIcon size={18} />
        <h3>더치페이</h3>
        <span className="split-bill__total">총 {formatPrice(totalPrice)}</span>
      </div>
      <div className="split-bill__list">
        {amounts.map((amount, i) => (
          <div className="split-bill__person" key={i}>
            <span className="split-bill__avatar">{String.fromCharCode(65 + i)}</span>
            <span className="split-bill__name">{i + 1}번째 사람</span>
            <strong className="split-bill__amount">{formatPrice(amount)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
