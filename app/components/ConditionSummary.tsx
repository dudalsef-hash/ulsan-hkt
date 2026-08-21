import { UsersIcon, WalletIcon, AlertTriangleIcon } from "./Icons";
import { formatPrice } from "../utils/price";

export interface Condition {
  people: number;
  budget: number;
  allergies: string[];
}

export function ConditionSummary({ condition }: { condition: Condition }) {
  return (
    <section className="condition-summary" aria-label="입력 조건 요약">
      <div className="condition-card">
        <div className="condition-card__icon condition-card__icon--people">
          <UsersIcon size={18} />
        </div>
        <div className="condition-card__content">
          <span className="condition-card__label">인원</span>
          <strong className="condition-card__value">{condition.people}명</strong>
        </div>
      </div>

      <div className="condition-card">
        <div className="condition-card__icon condition-card__icon--budget">
          <WalletIcon size={18} />
        </div>
        <div className="condition-card__content">
          <span className="condition-card__label">예산</span>
          <strong className="condition-card__value">{formatPrice(condition.budget)}</strong>
        </div>
      </div>

      <div className="condition-card">
        <div className="condition-card__icon condition-card__icon--allergy">
          <AlertTriangleIcon size={18} />
        </div>
        <div className="condition-card__content">
          <span className="condition-card__label">알레르기</span>
          <strong className="condition-card__value">
            {condition.allergies.length > 0 ? condition.allergies.join(", ") : "없음"}
          </strong>
        </div>
      </div>
    </section>
  );
}
