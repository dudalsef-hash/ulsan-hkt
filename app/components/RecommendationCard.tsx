import { UtensilsIcon } from "./Icons";
import { RiskBadge } from "./RiskBadge";
import { EvidenceInfo } from "./EvidenceInfo";
import { formatPrice } from "../utils/price";
import type { RiskLevel } from "../mock-data";

export interface RecommendationItem {
  name: string;
  quantity: number;
  price: number;
  risk?: RiskLevel;
  evidence?: string;
}

export function RecommendationCard({ item }: { item: RecommendationItem }) {
  return (
    <article className="rec-card">
      <div className="rec-card__icon">
        <UtensilsIcon size={20} />
      </div>
      <div className="rec-card__body">
        <div className="rec-card__top">
          <h4 className="rec-card__name">{item.name}</h4>
          {item.risk && <RiskBadge risk={item.risk} />}
        </div>
        <div className="rec-card__bottom">
          <span className="rec-card__quantity">{item.quantity}개</span>
          <span className="rec-card__price">{formatPrice(item.price)}</span>
        </div>
        {item.evidence && item.risk && (
          <EvidenceInfo evidence={item.evidence} risk={item.risk} />
        )}
      </div>
    </article>
  );
}
