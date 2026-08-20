import { ReceiptIcon } from "./Icons";
import { formatPrice, calculatePerPersonPrice } from "../utils/price";

interface PriceSummaryProps {
  totalPrice: number;
  people: number;
  budget: number;
}

export function PriceSummary({ totalPrice, people, budget }: PriceSummaryProps) {
  const perPerson = calculatePerPersonPrice(totalPrice, people);
  const remaining = Math.max(0, budget - totalPrice);

  return (
    <section className="price-summary" aria-label="가격 요약">
      <div className="price-summary__header">
        <ReceiptIcon size={18} />
        <h3>가격 요약</h3>
      </div>
      <div className="price-summary__grid">
        <div className="price-summary__item price-summary__item--total">
          <span className="price-summary__label">총 예상 금액</span>
          <strong className="price-summary__value">{formatPrice(totalPrice)}</strong>
        </div>
        <div className="price-summary__item price-summary__item--person">
          <span className="price-summary__label">1인 예상 금액</span>
          <strong className="price-summary__value">{formatPrice(perPerson)}</strong>
        </div>
        <div className="price-summary__item price-summary__item--remaining">
          <span className="price-summary__label">예산 잔액</span>
          <strong className="price-summary__value">{formatPrice(remaining)}</strong>
        </div>
      </div>
    </section>
  );
}
