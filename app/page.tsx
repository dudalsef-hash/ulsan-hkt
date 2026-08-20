"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { mockMenuItems, recommendation } from "./mock-data";
import { AllergyItem, ALLERGY_DATABASE, ALLERGY_CATEGORIES, searchAllergies, getAllergiesByCategory } from "./allergy-data";

type Screen = "setup" | "analyzing" | "results" | "order";

interface AnalyzedMenuItem {
  id: string;
  sourceName: string;
  translatedName: string;
  price: number;
  risk: "safe" | "caution" | "danger";
  evidence: string;
}

interface RecommendationResult {
  items: { emoji: string; name: string; quantity: number; price: number }[];
  totalPrice: number;
  reason: string;
}

interface AnalysisResult {
  menuItems: AnalyzedMenuItem[];
  recommendation: RecommendationResult;
  allergyWarnings: string[];
  orderText: { local: string; korean: string };
  allergyQuestion: { local: string; korean: string };
}

const ANALYSIS_STEPS = [
  "메뉴판의 글자를 읽고 있어요",
  "메뉴명과 가격을 정리하고 있어요",
  "알레르기 정보를 확인하고 있어요",
  "조건에 맞는 주문 조합을 계산하고 있어요",
];

export default function Home() {
  const [screen, setScreen] = useState<Screen>("setup");
  const [people, setPeople] = useState(3);
  const [budget, setBudget] = useState(4000);
  const [selectedAllergies, setSelectedAllergies] = useState<AllergyItem[]>([
    ALLERGY_DATABASE.find((a) => a.id === "peanut")!,
  ]);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const totalPrice = analysisResult?.recommendation.totalPrice ?? recommendation.totalPrice;
  const splitAmounts = useMemo(() => {
    const base = Math.floor(totalPrice / people);
    const remainder = totalPrice % people;
    return Array.from({ length: people }, (_, index) =>
      base + (index < remainder ? 1 : 0),
    );
  }, [people, totalPrice]);

  useEffect(() => {
    return () => timers.current.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function startAnalysis(file?: File) {
    timers.current.forEach(clearTimeout);
    timers.current = [];

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
    setAnalysisStep(0);
    setAnalysisResult(null);
    setAnalysisError(null);
    setScreen("analyzing");

    // 분석 단계 애니메이션
    [650, 1300, 1950].forEach((delay, index) => {
      timers.current.push(setTimeout(() => setAnalysisStep(index + 1), delay));
    });

    const startTime = Date.now();

    try {
      // Gemini API 호출
      let imageBase64: string | null = null;
      if (file) {
        imageBase64 = await fileToBase64(file);
      }

      const response = await fetch("/api/analyze-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageBase64,
          allergies: selectedAllergies.map((a) => ({ id: a.id, name: a.name, nameEn: a.nameEn })),
          people,
          budget,
        }),
      });

      if (!response.ok) {
        throw new Error("API 호출 실패");
      }

      const result: AnalysisResult = await response.json();
      setAnalysisResult(result);
      
      // 최소 2.7초는 분석 애니메이션 보여주기
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 2700 - elapsed);
      timers.current.push(setTimeout(() => setScreen("results"), remaining));
    } catch {
      // API 실패 시 더미 데이터로 폴백
      setAnalysisError("AI 분석을 사용할 수 없어 샘플 결과를 표시합니다.");
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 2700 - elapsed);
      timers.current.push(setTimeout(() => setScreen("results"), remaining));
    }
  }

  function startDummyAnalysis(file?: File) {
    startAnalysis(file);
  }

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) startDummyAnalysis(file);
    event.target.value = "";
  }

  function resetDemo() {
    timers.current.forEach(clearTimeout);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setAnalysisStep(0);
    setAnalysisResult(null);
    setAnalysisError(null);
    setScreen("setup");
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <section className="phone-frame" aria-live="polite">
        <AppHeader screen={screen} onBack={screen === "setup" ? undefined : resetDemo} />

        {screen === "setup" && (
          <SetupScreen
            people={people}
            budget={budget}
            selectedAllergies={selectedAllergies}
            onPeopleChange={setPeople}
            onBudgetChange={setBudget}
            onAllergiesChange={setSelectedAllergies}
            onImage={handleImage}
            onSample={() => startDummyAnalysis()}
          />
        )}

        {screen === "analyzing" && (
          <AnalyzingScreen activeStep={analysisStep} previewUrl={previewUrl} />
        )}

        {screen === "results" && (
          <ResultsScreen
            people={people}
            budget={budget}
            selectedAllergies={selectedAllergies}
            previewUrl={previewUrl}
            analysisResult={analysisResult}
            analysisError={analysisError}
            onOrder={() => setScreen("order")}
          />
        )}

        {screen === "order" && (
          <OrderScreen
            splitAmounts={splitAmounts}
            selectedAllergies={selectedAllergies}
            analysisResult={analysisResult}
            onRestart={resetDemo}
          />
        )}
      </section>
    </main>
  );
}

function AppHeader({ screen, onBack }: { screen: Screen; onBack?: () => void }) {
  return (
    <header className="topbar">
      {onBack ? (
        <button className="icon-button" onClick={onBack} aria-label="처음으로 돌아가기">←</button>
      ) : (
        <div className="brand-mark" aria-hidden="true">M</div>
      )}
      <div className="brand-copy">
        <p className="eyebrow">AI DINING COPILOT</p>
        <h1>MenuMate</h1>
      </div>
      <span className="demo-pill">DUMMY</span>
      <span className="screen-index" aria-label="진행 단계">
        {screen === "setup" ? "1/4" : screen === "analyzing" ? "2/4" : screen === "results" ? "3/4" : "4/4"}
      </span>
    </header>
  );
}

function SetupScreen({
  people,
  budget,
  selectedAllergies,
  onPeopleChange,
  onBudgetChange,
  onAllergiesChange,
  onImage,
  onSample,
}: {
  people: number;
  budget: number;
  selectedAllergies: AllergyItem[];
  onPeopleChange: (value: number) => void;
  onBudgetChange: (value: number) => void;
  onAllergiesChange: (value: AllergyItem[]) => void;
  onImage: (event: ChangeEvent<HTMLInputElement>) => void;
  onSample: () => void;
}) {
  const [allergySearch, setAllergySearch] = useState("");
  const [showAllergyPanel, setShowAllergyPanel] = useState(false);
  const searchResults = useMemo(() => searchAllergies(allergySearch), [allergySearch]);
  const categorized = useMemo(() => getAllergiesByCategory(), []);

  function toggleAllergy(item: AllergyItem) {
    const exists = selectedAllergies.find((a) => a.id === item.id);
    if (exists) {
      onAllergiesChange(selectedAllergies.filter((a) => a.id !== item.id));
    } else {
      onAllergiesChange([...selectedAllergies, item]);
    }
  }

  function isSelected(id: string) {
    return selectedAllergies.some((a) => a.id === id);
  }

  return (
    <div className="screen-content enter-animation">
      <section className="hero-card">
        <p className="step-label">SCAN · DECIDE · ORDER</p>
        <h2>낯선 메뉴도,<br />한 번에 결정하세요.</h2>
        <p>메뉴판을 촬영하면 모두의 조건에 맞는 주문 조합을 찾아드려요.</p>
        <div className="country-badge"><span>🇯🇵</span><div><small>오늘의 체험</small><strong>일본 식당</strong></div></div>
      </section>

      <section className="form-card">
        <div className="section-heading">
          <div><p>OUR TABLE</p><h3>우리의 식사 조건</h3></div>
          <span>수정 가능</span>
        </div>

        <div className="control-row">
          <div className="control-label"><span>👥</span><div><strong>인원</strong><small>함께 식사하는 사람</small></div></div>
          <div className="stepper">
            <button onClick={() => onPeopleChange(Math.max(1, people - 1))} aria-label="인원 줄이기">−</button>
            <strong>{people}명</strong>
            <button onClick={() => onPeopleChange(Math.min(8, people + 1))} aria-label="인원 늘리기">＋</button>
          </div>
        </div>

        <label className="budget-control">
          <span>💴</span>
          <div><strong>총예산</strong><small>현지 통화 기준</small></div>
          <div className="budget-input"><b>¥</b><input type="number" min="1000" step="500" value={budget} onChange={(e) => onBudgetChange(Number(e.target.value))} aria-label="총예산" /></div>
        </label>

        {/* 알레르기 검색 엔진 섹션 */}
        <div className="allergy-section">
          <div className="allergy-header">
            <div className="control-label"><span>⚠️</span><div><strong>알레르기 & 식이제한</strong><small>검색해서 추가하세요 ({selectedAllergies.length}개 선택됨)</small></div></div>
            <button className="allergy-panel-toggle" onClick={() => setShowAllergyPanel(!showAllergyPanel)}>
              {showAllergyPanel ? "접기" : "전체 보기"}
            </button>
          </div>

          {/* 선택된 알레르기 태그들 */}
          {selectedAllergies.length > 0 && (
            <div className="selected-allergies">
              {selectedAllergies.map((item) => (
                <button key={item.id} className="allergy-tag active" onClick={() => toggleAllergy(item)}>
                  <span>{item.emoji}</span>
                  <span>{item.name}</span>
                  <i>×</i>
                </button>
              ))}
            </div>
          )}

          {/* 검색 입력 */}
          <div className="allergy-search-box">
            <input
              type="text"
              placeholder="알레르기 검색 (예: 땅콩, milk, エビ, gluten...)"
              value={allergySearch}
              onChange={(e) => setAllergySearch(e.target.value)}
              onFocus={() => setShowAllergyPanel(true)}
              aria-label="알레르기 검색"
            />
            {allergySearch && (
              <button className="search-clear" onClick={() => setAllergySearch("")}>×</button>
            )}
          </div>

          {/* 검색 결과 */}
          {allergySearch && searchResults.length > 0 && (
            <div className="allergy-search-results">
              {searchResults.slice(0, 10).map((item) => (
                <button
                  key={item.id}
                  className={`allergy-result-item ${isSelected(item.id) ? "selected" : ""}`}
                  onClick={() => toggleAllergy(item)}
                >
                  <span className="result-emoji">{item.emoji}</span>
                  <div className="result-info">
                    <strong>{item.name}</strong>
                    <small>{item.nameEn} · {item.category}</small>
                  </div>
                  <i>{isSelected(item.id) ? "✓" : "+"}</i>
                </button>
              ))}
            </div>
          )}

          {allergySearch && searchResults.length === 0 && (
            <div className="allergy-no-results">
              <p>"{allergySearch}"에 대한 결과가 없습니다</p>
              <small>다른 언어나 키워드로 검색해 보세요</small>
            </div>
          )}

          {/* 전체 카테고리 패널 */}
          {showAllergyPanel && !allergySearch && (
            <div className="allergy-panel">
              {ALLERGY_CATEGORIES.map((category) => (
                <div key={category} className="allergy-category">
                  <h4>{category}</h4>
                  <div className="allergy-grid">
                    {categorized[category]?.map((item) => (
                      <button
                        key={item.id}
                        className={`allergy-chip ${isSelected(item.id) ? "active" : ""}`}
                        onClick={() => toggleAllergy(item)}
                      >
                        <span>{item.emoji}</span>
                        <span>{item.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <label className="scan-card">
        <input type="file" accept="image/*" capture="environment" onChange={onImage} />
        <span className="camera-icon" aria-hidden="true">▣</span>
        <div><strong>메뉴판 촬영하기</strong><small>A4 메뉴가 화면에 모두 들어오게 찍어주세요</small></div>
        <b>→</b>
      </label>
      <button className="sample-button" onClick={onSample}>사진 없이 샘플 메뉴로 체험하기</button>
      <p className="safety-note">알레르기 분석은 참고용이며 실제 성분과 교차오염 여부는 직원에게 확인하세요.</p>
    </div>
  );
}

function AnalyzingScreen({ activeStep, previewUrl }: { activeStep: number; previewUrl: string | null }) {
  return (
    <div className="screen-content analyzing-screen enter-animation">
      <div className="photo-stage">
        {previewUrl ? (
          // Blob URL 미리보기는 원본 크기를 이미 클라이언트에서 제한하므로 최적화 대상에서 제외합니다.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="촬영한 메뉴판 미리보기" />
        ) : (
          <div className="sample-menu">
            <b>レストラン さくら</b>
            <span>豚骨ラーメン ¥1,000</span>
            <span>担々麺 ¥1,100</span>
            <span>焼き餃子 ¥600</span>
          </div>
        )}
        <div className="scan-line" />
        <span className="ai-chip">AI 분석 중</span>
      </div>
      <div className="analysis-copy">
        <p className="step-label">MENU UNDERSTANDING</p>
        <h2>메뉴판을 이해하고 있어요</h2>
        <p>잠시만 기다리면 주문 조합을 보여드릴게요.</p>
      </div>
      <ol className="analysis-list">
        {ANALYSIS_STEPS.map((step, index) => (
          <li key={step} className={index < activeStep ? "done" : index === activeStep ? "active" : ""}>
            <span>{index < activeStep ? "✓" : index + 1}</span><p>{step}</p>{index === activeStep && <i />}
          </li>
        ))}
      </ol>
      <div className="dummy-notice"><b>더미 분석 모드</b><span>현재는 서버 호출 없이 준비된 결과를 표시합니다.</span></div>
    </div>
  );
}

/** 최적 메뉴 추천: 안전한 메뉴만 필터링 → 예산/인원에 맞는 조합 자동 계산 */
function OptimalMenuRecommendation({
  menuItems,
  people,
  budget,
  selectedAllergies,
}: {
  menuItems: AnalyzedMenuItem[];
  people: number;
  budget: number;
  selectedAllergies: AllergyItem[];
}) {
  const optimalCombo = useMemo(() => {
    // 1. 안전한 메뉴만 필터링 (danger 제외, caution은 포함하되 표시)
    const safeItems = menuItems.filter((item) => item.risk !== "danger");

    if (safeItems.length === 0) return null;

    // 2. 인원수에 맞게 메뉴 조합 계산 (예산 내에서 최대한 다양하게)
    const perPersonBudget = budget / people;
    const sorted = [...safeItems].sort((a, b) => a.price - b.price);

    const selected: { item: AnalyzedMenuItem; quantity: number }[] = [];
    let remaining = budget;
    let totalItems = 0;
    const targetItems = people + 1; // 인원수 + 1개 정도가 적절

    // 가격대별로 다양하게 선택
    for (const item of sorted) {
      if (totalItems >= targetItems) break;
      if (item.price <= remaining) {
        const maxQty = Math.min(
          Math.floor(remaining / item.price),
          Math.ceil(people / 2), // 한 메뉴는 최대 인원/2개까지
        );
        const qty = Math.min(maxQty, targetItems - totalItems);
        if (qty > 0) {
          selected.push({ item, quantity: qty });
          remaining -= item.price * qty;
          totalItems += qty;
        }
      }
    }

    if (selected.length === 0) return null;

    const totalPrice = selected.reduce((sum, s) => sum + s.item.price * s.quantity, 0);
    const hasCaution = selected.some((s) => s.item.risk === "caution");

    return { selected, totalPrice, remaining: budget - totalPrice, hasCaution, perPersonBudget };
  }, [menuItems, people, budget]);

  if (!optimalCombo) {
    return (
      <section className="optimal-card">
        <div className="optimal-header"><span className="optimal-badge">OPTIMAL PICK</span></div>
        <h3>최적 메뉴 추천</h3>
        <p className="optimal-empty">안전한 메뉴가 없거나 예산 내 조합을 찾을 수 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="optimal-card">
      <div className="optimal-header">
        <span className="optimal-badge">OPTIMAL PICK</span>
        <span className="optimal-safe-badge">알레르기 안전 ✓</span>
      </div>
      <h3>최적 메뉴 추천</h3>
      <p className="optimal-desc">
        {selectedAllergies.length > 0
          ? `${selectedAllergies.map((a) => a.name).join(", ")} 제외 · `
          : ""}
        {people}명 · 예산 ¥{budget.toLocaleString()} 기준
      </p>

      <div className="optimal-items">
        {optimalCombo.selected.map(({ item, quantity }) => (
          <div key={item.id} className="optimal-item">
            <div className={`risk-dot ${item.risk}`} />
            <div className="optimal-item-info">
              <strong>{item.translatedName}</strong>
              <small>{item.sourceName}</small>
            </div>
            <span className="optimal-qty">× {quantity}</span>
            <b>¥{(item.price * quantity).toLocaleString()}</b>
          </div>
        ))}
      </div>

      <div className="optimal-summary">
        <div className="optimal-total">
          <small>추천 총액</small>
          <strong>¥{optimalCombo.totalPrice.toLocaleString()}</strong>
        </div>
        <div className="optimal-remain">
          <small>예산 잔액</small>
          <strong>¥{optimalCombo.remaining.toLocaleString()}</strong>
        </div>
        <div className="optimal-per-person">
          <small>1인당</small>
          <strong>¥{Math.ceil(optimalCombo.totalPrice / people).toLocaleString()}</strong>
        </div>
      </div>

      {optimalCombo.hasCaution && (
        <p className="optimal-caution">⚠️ 일부 메뉴는 성분 확인이 필요할 수 있어요. 직원에게 확인하세요.</p>
      )}
    </section>
  );
}

function ResultsScreen({ people, budget, selectedAllergies, previewUrl, analysisResult, analysisError, onOrder }: { people: number; budget: number; selectedAllergies: AllergyItem[]; previewUrl: string | null; analysisResult: AnalysisResult | null; analysisError: string | null; onOrder: () => void }) {
  // 실제 AI 결과가 있으면 사용, 없으면 더미 데이터 폴백
  const menuItems = analysisResult?.menuItems ?? mockMenuItems;
  const rec = analysisResult?.recommendation ?? recommendation;
  const warnings = analysisResult?.allergyWarnings ?? [];
  const excludedCount = menuItems.filter((item) => item.risk === "danger").length;

  return (
    <div className="screen-content enter-animation results-screen">
      {analysisError && (
        <div className="dummy-notice" style={{ marginBottom: 12 }}><b>폴백 모드</b><span>{analysisError}</span></div>
      )}

      <section className="result-summary">
        <div className="result-icon">✓</div>
        <div><p>분석 완료</p><h2>{menuItems.length}개 메뉴를 찾았어요</h2><span>{people}명 · 예산 ¥{budget.toLocaleString()} · 알레르기 {selectedAllergies.length}개 적용</span></div>
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="분석한 메뉴판" />
        )}
      </section>

      {selectedAllergies.length > 0 && excludedCount > 0 && (
        <div className="alert-card"><span>⚠️</span><div><strong>알레르기 위험 메뉴 {excludedCount}개 제외</strong><p>{selectedAllergies.map(a => a.name).join(", ")} 관련 메뉴는 추천에 포함하지 않았어요.</p></div></div>
      )}

      {warnings.length > 0 && warnings.map((w, i) => (
        <div key={i} className="alert-card" style={{ marginTop: 8 }}><span>🔍</span><div><p>{w}</p></div></div>
      ))}

      {/* 최적 메뉴 추천 - 안전한 메뉴만 필터링 후 예산/인원 맞춤 */}
      <OptimalMenuRecommendation
        menuItems={menuItems}
        people={people}
        budget={budget}
        selectedAllergies={selectedAllergies}
      />

      <div className="section-heading menu-heading"><div><p>RECOGNIZED MENU</p><h3>인식한 메뉴</h3></div><button>전체 보기</button></div>
      <div className="menu-list">
        {menuItems.slice(0, 6).map((item) => (
          <article className="menu-item" key={item.id}>
            <div className={`risk-dot ${item.risk}`} />
            <div className="menu-copy"><small>{item.sourceName}</small><strong>{item.translatedName}</strong><p>{item.evidence}</p></div>
            <b>¥{item.price.toLocaleString()}</b>
          </article>
        ))}
      </div>

      <section className="recommend-card">
        <div className="recommend-top"><span>BEST MATCH</span><b>조건 일치</b></div>
        <h3>모두를 위한 추천 조합</h3>
        <p className="recommend-reason">{rec.reason ?? `${people}명이 먹기 충분하고, 알레르기 위험 메뉴를 제외했어요.`}</p>
        <div className="recommend-items">
          {rec.items.map((item) => <div key={item.name}><span><i>{item.emoji}</i>{item.name}</span><span>× {item.quantity}</span><b>¥{item.price.toLocaleString()}</b></div>)}
        </div>
        <div className="total-row"><div><small>총 주문 금액</small><strong>¥{rec.totalPrice.toLocaleString()}</strong></div><div><small>예산 잔액</small><strong>¥{Math.max(0, budget - rec.totalPrice).toLocaleString()}</strong></div></div>
      </section>

      <button className="primary-button" onClick={onOrder}>이 조합으로 주문하기 <span>→</span></button>
      <p className="safety-note">⚠️ 메뉴판에서 확인할 수 없는 조리유·교차오염 정보는 직원에게 확인하세요.</p>
    </div>
  );
}

function OrderScreen({ splitAmounts, selectedAllergies, analysisResult, onRestart }: { splitAmounts: number[]; selectedAllergies: AllergyItem[]; analysisResult: AnalysisResult | null; onRestart: () => void }) {
  const rec = analysisResult?.recommendation ?? recommendation;
  const orderText = analysisResult?.orderText ?? {
    local: "豚骨ラーメンを一つ、\n醤油ラーメンを一つ、\nチャーシュー丼を一つ、\n焼き餃子を一つお願いします。",
    korean: "돈코츠라멘 하나, 쇼유라멘 하나, 차슈덮밥 하나, 교자 하나 주세요.",
  };
  const allergyQ = analysisResult?.allergyQuestion ?? {
    local: selectedAllergies.map(a => `${a.nameEn}アレルギーがあります。`).join("") + "料理やソースに含まれていますか？",
    korean: selectedAllergies.map(a => a.name).join(", ") + " 알레르기가 있습니다. 음식이나 소스에 들어가나요?",
  };

  return (
    <div className="screen-content enter-animation order-screen">
      <section className="order-hero">
        <span>🇯🇵 직원에게 이 화면을 보여주세요</span>
        <p dangerouslySetInnerHTML={{ __html: orderText.local.replace(/\n/g, "<br/>") }} />
        <small>{orderText.korean}</small>
      </section>

      {selectedAllergies.length > 0 && (
        <section className="allergy-question">
          <div className="question-title"><span>⚠️</span><div><p>ALLERGY CHECK</p><h3>알레르기 확인 문장</h3></div></div>
          <blockquote dangerouslySetInnerHTML={{ __html: allergyQ.local.replace(/\n/g, "<br/>") }} />
          <p>{allergyQ.korean}</p>
          <button onClick={() => navigator.clipboard?.writeText(allergyQ.local)}>문장 복사하기</button>
        </section>
      )}

      <section className="split-card">
        <div className="section-heading"><div><p>SPLIT THE BILL</p><h3>더치페이</h3></div><strong>총 ¥{rec.totalPrice.toLocaleString()}</strong></div>
        <div className="split-list">
          {splitAmounts.map((amount, index) => <div key={index}><span>{String.fromCharCode(65 + index)}</span><p>{index + 1}번째 사람</p><strong>¥{amount.toLocaleString()}</strong></div>)}
        </div>
      </section>

      <button className="primary-button" onClick={onRestart}>처음부터 다시 체험하기</button>
      <p className="safety-note">MenuMate의 분석은 참고용입니다. 알레르기와 교차오염 여부는 반드시 식당에 직접 확인하세요.</p>
    </div>
  );
}


/** 파일을 Base64 문자열로 변환 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // data:image/jpeg;base64,... 에서 base64 부분만 추출
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
