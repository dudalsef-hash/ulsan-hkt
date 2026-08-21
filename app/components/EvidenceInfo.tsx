import type { RiskLevel } from "../mock-data";
import { CheckIcon, InfoIcon, AlertTriangleIcon } from "./Icons";

export function EvidenceInfo({ evidence, risk }: { evidence: string; risk: RiskLevel }) {
  const IconComponent = risk === "safe" ? CheckIcon : risk === "caution" ? InfoIcon : AlertTriangleIcon;
  const className = `evidence-info evidence-info--${risk}`;

  return (
    <span className={className} title={evidence}>
      <IconComponent size={12} />
      <span>{evidence}</span>
    </span>
  );
}
