import { HelpCircleIcon } from "./Icons";

export function Header() {
  return (
    <header className="app-header">
      <div className="app-header__left">
        <div className="app-header__logo" aria-hidden="true">
          <span style={{ color: "#ffffff", fontSize: "16px", fontWeight: 900, letterSpacing: "-0.08em" }}>SP</span>
        </div>
        <div className="app-header__brand">
          <span className="app-header__label">AI FOOD SAFETY</span>
          <h1 className="app-header__title">Safe Plate</h1>
        </div>
      </div>
      <button className="app-header__help" aria-label="도움말">
        <HelpCircleIcon size={20} />
      </button>
    </header>
  );
}
