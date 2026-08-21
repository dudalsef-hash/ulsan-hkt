import { LoaderIcon, RefreshIcon } from "./Icons";

export function LoadingState() {
  return (
    <div className="state-screen state-screen--loading" role="status" aria-live="polite">
      <div className="state-screen__icon state-screen__icon--loading">
        <LoaderIcon size={32} />
      </div>
      <h3 className="state-screen__title">AI가 메뉴를 분석하고 있어요...</h3>
      <p className="state-screen__desc">예산과 알레르기 조건을 고려해 최적의 조합을 찾고 있습니다.</p>
      <div className="state-screen__skeleton">
        <div className="skeleton-bar" />
        <div className="skeleton-bar skeleton-bar--short" />
        <div className="skeleton-bar skeleton-bar--medium" />
      </div>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="state-screen state-screen--empty" role="status">
      <div className="state-screen__icon state-screen__icon--empty">
        <span aria-hidden="true">🍽️</span>
      </div>
      <h3 className="state-screen__title">조건에 맞는 메뉴를 찾지 못했어요</h3>
      <p className="state-screen__desc">조건을 조금 변경해보세요. 예산을 늘리거나 알레르기 항목을 조정하면 더 많은 메뉴를 찾을 수 있어요.</p>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="state-screen state-screen--error" role="alert">
      <div className="state-screen__icon state-screen__icon--error">
        <span aria-hidden="true">⚠️</span>
      </div>
      <h3 className="state-screen__title">추천 결과를 불러오지 못했어요</h3>
      <p className="state-screen__desc">네트워크 문제가 발생했습니다. 다시 시도해주세요.</p>
      <button className="state-screen__retry" onClick={onRetry}>
        <RefreshIcon size={16} />
        다시 시도
      </button>
    </div>
  );
}
