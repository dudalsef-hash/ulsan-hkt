import type { MockMenuItem } from "../mock-data";
import { RiskBadge } from "./RiskBadge";
import { EvidenceInfo } from "./EvidenceInfo";
import { formatPrice } from "../utils/price";

export function MenuItemCard({ item }: { item: MockMenuItem }) {
  return (
    <article className="menu-item-card">
      <div className="menu-item-card__left">
        <div className="menu-item-card__names">
          <span className="menu-item-card__source">{item.sourceName}</span>
          <strong className="menu-item-card__translated">{item.translatedName}</strong>
        </div>
        <EvidenceInfo evidence={item.evidence} risk={item.risk} />
      </div>
      <div className="menu-item-card__right">
        <RiskBadge risk={item.risk} />
        <strong className="menu-item-card__price">{formatPrice(item.price)}</strong>
      </div>
    </article>
  );
}
