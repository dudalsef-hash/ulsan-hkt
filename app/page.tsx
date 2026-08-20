"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { mockMenuItems, recommendation } from "./mock-data";

type Screen = "setup" | "analyzing" | "results" | "order";

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
  const [peanutAllergy, setPeanutAllergy] = useState(true);
  const [avoidSpicy, setAvoidSpicy] = useState(true);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const splitAmounts = useMemo(() => {
    const base = Math.floor(recommendation.totalPrice / people);
    const remainder = recommendation.totalPrice % people;
    return Array.from({ length: people }, (_, index) =>
      base + (index < remainder ? 1 : 0),
    );
  }, [people]);

  useEffect(() => {
    return () => timers.current.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function startDummyAnalysis(file?: File) {
    timers.current.forEach(clearTimeout);
    timers.current = [];

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
    setAnalysisStep(0);
    setScreen("analyzing");

    [650, 1300, 1950].forEach((delay, index) => {
      timers.current.push(setTimeout(() => setAnalysisStep(index + 1), delay));
    });
    timers.current.push(setTimeout(() => setScreen("results"), 2700));
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
            peanutAllergy={peanutAllergy}
            avoidSpicy={avoidSpicy}
            onPeopleChange={setPeople}
            onBudgetChange={setBudget}
            onPeanutChange={setPeanutAllergy}
            onSpicyChange={setAvoidSpicy}
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
            peanutAllergy={peanutAllergy}
            previewUrl={previewUrl}
            onOrder={() => setScreen("order")}
          />
        )}

        {screen === "order" && (
          <OrderScreen splitAmounts={splitAmounts} onRestart={resetDemo} />
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
  peanutAllergy,
  avoidSpicy,
  onPeopleChange,
  onBudgetChange,
  onPeanutChange,
  onSpicyChange,
  onImage,
  onSample,
}: {
  people: number;
  budget: number;
  peanutAllergy: boolean;
  avoidSpicy: boolean;
  onPeopleChange: (value: number) => void;
  onBudgetChange: (value: number) => void;
  onPeanutChange: (value: boolean) => void;
  onSpicyChange: (value: boolean) => void;
  onImage: (event: ChangeEvent<HTMLInputElement>) => void;
  onSample: () => void;
}) {
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

        <div className="toggle-grid">
          <button className={peanutAllergy ? "option-toggle active danger" : "option-toggle"} onClick={() => onPeanutChange(!peanutAllergy)} aria-pressed={peanutAllergy}>
            <span>🥜</span><div><strong>땅콩 알레르기</strong><small>{peanutAllergy ? "적용 중" : "적용 안 함"}</small></div><i>{peanutAllergy ? "✓" : "+"}</i>
          </button>
          <button className={avoidSpicy ? "option-toggle active" : "option-toggle"} onClick={() => onSpicyChange(!avoidSpicy)} aria-pressed={avoidSpicy}>
            <span>🌶️</span><div><strong>맵지 않게</strong><small>{avoidSpicy ? "적용 중" : "적용 안 함"}</small></div><i>{avoidSpicy ? "✓" : "+"}</i>
          </button>
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

function ResultsScreen({ people, budget, peanutAllergy, previewUrl, onOrder }: { people: number; budget: number; peanutAllergy: boolean; previewUrl: string | null; onOrder: () => void }) {
  const excludedCount = peanutAllergy ? mockMenuItems.filter((item) => item.risk === "danger").length : 0;

  return (
    <div className="screen-content enter-animation results-screen">
      <section className="result-summary">
        <div className="result-icon">✓</div>
        <div><p>분석 완료</p><h2>8개 메뉴를 찾았어요</h2><span>{people}명 · 예산 ¥{budget.toLocaleString()} · 일본어 → 한국어</span></div>
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="분석한 메뉴판" />
        )}
      </section>

      {peanutAllergy && (
        <div className="alert-card"><span>🥜</span><div><strong>땅콩이 확인된 메뉴 {excludedCount}개 제외</strong><p>탄탄멘과 피넛 냉두부는 추천에 포함하지 않았어요.</p></div></div>
      )}

      <div className="section-heading menu-heading"><div><p>RECOGNIZED MENU</p><h3>인식한 메뉴</h3></div><button>전체 보기</button></div>
      <div className="menu-list">
        {mockMenuItems.slice(0, 4).map((item) => (
          <article className="menu-item" key={item.id}>
            <div className={`risk-dot ${item.risk}`} />
            <div className="menu-copy"><small>{item.sourceName}</small><strong>{item.translatedName}</strong><p>{item.evidence}</p></div>
            <b>¥{item.price.toLocaleString()}</b>
          </article>
        ))}
      </div>

      <section className="recommend-card">
        <div className="recommend-top"><span>BEST MATCH</span><b>조건 일치 96%</b></div>
        <h3>모두를 위한 추천 조합</h3>
        <p className="recommend-reason">3명이 먹기 충분하고, 땅콩과 매운 메뉴를 제외했어요.</p>
        <div className="recommend-items">
          {recommendation.items.map((item) => <div key={item.name}><span><i>{item.emoji}</i>{item.name}</span><span>× {item.quantity}</span><b>¥{item.price.toLocaleString()}</b></div>)}
        </div>
        <div className="total-row"><div><small>총 주문 금액</small><strong>¥{recommendation.totalPrice.toLocaleString()}</strong></div><div><small>예산 잔액</small><strong>¥{Math.max(0, budget - recommendation.totalPrice).toLocaleString()}</strong></div></div>
      </section>

      <button className="primary-button" onClick={onOrder}>이 조합으로 주문하기 <span>→</span></button>
      <p className="safety-note">⚠️ 메뉴판에서 확인할 수 없는 조리유·교차오염 정보는 직원에게 확인하세요.</p>
    </div>
  );
}

function OrderScreen({ splitAmounts, onRestart }: { splitAmounts: number[]; onRestart: () => void }) {
  return (
    <div className="screen-content enter-animation order-screen">
      <section className="order-hero">
        <span>🇯🇵 직원에게 이 화면을 보여주세요</span>
        <p>豚骨ラーメンを一つ、<br />醤油ラーメンを一つ、<br />チャーシュー丼を一つ、<br />焼き餃子を一つお願いします。</p>
        <small>돈코츠라멘 하나, 쇼유라멘 하나, 차슈덮밥 하나, 교자 하나 주세요.</small>
      </section>

      <section className="allergy-question">
        <div className="question-title"><span>🥜</span><div><p>ALLERGY CHECK</p><h3>알레르기 확인 문장</h3></div></div>
        <blockquote>落花生アレルギーがあります。<br />料理やソースに落花生が含まれていますか？</blockquote>
        <p>땅콩 알레르기가 있습니다. 음식이나 소스에 땅콩이 들어가나요?</p>
        <button onClick={() => navigator.clipboard?.writeText("落花生アレルギーがあります。料理やソースに落花生が含まれていますか？")}>문장 복사하기</button>
      </section>

      <section className="split-card">
        <div className="section-heading"><div><p>SPLIT THE BILL</p><h3>더치페이</h3></div><strong>총 ¥{recommendation.totalPrice.toLocaleString()}</strong></div>
        <div className="split-list">
          {splitAmounts.map((amount, index) => <div key={index}><span>{String.fromCharCode(65 + index)}</span><p>{index + 1}번째 사람</p><strong>¥{amount.toLocaleString()}</strong></div>)}
        </div>
      </section>

      <button className="primary-button" onClick={onRestart}>처음부터 다시 체험하기</button>
      <p className="safety-note">MenuMate의 분석은 참고용입니다. 알레르기와 교차오염 여부는 반드시 식당에 직접 확인하세요.</p>
    </div>
  );
}
