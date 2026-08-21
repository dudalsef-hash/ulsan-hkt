import type { RiskLevel } from "../mock-data";
import { ShieldCheckIcon, AlertTriangleIcon, CircleAlertIcon } from "./Icons";

const RISK_CONFIG: Record<RiskLevel, { label: string; className: string; icon: typeof ShieldCheckIcon }> = {
  safe: {
    label: "안전",
    className: "risk-badge risk-badge--safe",
    icon: ShieldCheckIcon,
  },
  caution: {
    label: "확인 필요",
    className: "risk-badge risk-badge--caution",
    icon: AlertTriangleIcon,
  },
  danger: {
    label: "알레르기 위험",
    className: "risk-badge risk-badge--danger",
    icon: CircleAlertIcon,
  },
};

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  const config = RISK_CONFIG[risk];
  const IconComponent = config.icon;

  return (
    <span className={config.className} role="status" aria-label={`안전도: ${config.label}`}>
      <IconComponent size={14} />
      <span>{config.label}</span>
    </span>
  );
}
