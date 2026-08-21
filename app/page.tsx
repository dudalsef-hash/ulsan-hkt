"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { mockMenuItems, recommendation } from "./mock-data";
import type { MockMenuItem } from "./mock-data";
import { Header } from "./components/Header";
import { ConditionSummary } from "./components/ConditionSummary";
import type { Condition } from "./components/ConditionSummary";
import { RecommendationCard } from "./components/RecommendationCard";
import { MenuItemCard } from "./components/MenuItemCard";
import { PriceSummary } from "./components/PriceSummary";
import { SplitBillCard } from "./components/SplitBillCard";
import { LoadingState, EmptyState, ErrorState } from "./components/StateScreens";
import { SparklesIcon, CheckIcon, UtensilsIcon } from "./components/Icons";


type Screen = "setup" | "analyzing" | "results" | "order";
type AppState = "idle" | "loading" | "success" | "error" | "empty";

const ANALYSIS_STEPS = [
  "메뉴판의 글자를 읽고 있어요",
  "메뉴명과 가격을 정리하고 있어요",
  "알레르기 정보를 확인하고 있어요",
  "조건에 맞는 주문 조합을 계산하고 있어요",
];

export default function Home() {
  const [screen, setScreen] = useState<Screen>("setup");
  const [appState, setAppState] = useState<AppState>("idle");
  const [people, setPeople] = useState(3);
  const [budget, setBudget] = useState(4000);
  const [peanutAllergy, setPeanutAllergy] = useState(true);
  const [avoidSpicy, setAvoidSpicy] = useState(true);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const condition: Condition = useMemo(() => ({
    people,
    budget,
    allergies: [
      ...(peanutAllergy ? ["땅콩"] : []),
      ...(avoidSpicy ? ["매운 음식"] : []),
    ],
  }), [people, budget, peanutAllergy, avoidSpicy]);

  const recommendedItems = useMemo(() => {
    return recommendation.items.map((rec) => {
      const menuItem = mockMenuItems.find((m) => m.translatedName === rec.name);
      return {
        ...rec,
        risk: menuItem?.risk,
        evidence: menuItem?.evidence,
      };
    });
  }, []);

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
    setAppState("loading");
    setScreen("analyzing");

    [650, 1300, 1950].forEach((delay, index) => {
      timers.current.push(setTimeout(() => setAnalysisStep(index + 1), delay));
    });
    timers.current.push(setTimeout(() => {
      setAppState("success");
      setScreen("results");
    }, 2700));
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
    setAppState("idle");
    setScreen("setup");
  }

  return (
    <main className="app-shell">
      <div className="app-container">
        <Header />

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
            condition={condition}
            recommendedItems={recommendedItems}
            menuItems={mockMenuItems}
            totalPrice={recommendation.totalPrice}
            appState={appState}
            onOrder={() => setScreen("order")}
            onRetry={() => startDummyAnalysis()}
          />
        )}

        {screen === "order" && (
          <OrderScreen
            condition={condition}
            totalPrice={recommendation.totalPrice}
            onRestart={resetDemo}
          />
        )}
      </div>
    </main>
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
  onPeopleChange: (v: number) => void;
  onBudgetChange: (v: number) => void;
  onPeanutChange: (v: boolean) => void;
  onSpicyChange: (v: boolean) => void;
  onImage: (e: ChangeEvent<HTMLInputElement>) => void;
  onSample: () => void;
}) {
  return (
    <div className="screen-content fade-in" aria-live="polite">
      <section className="hero-section">
        <div className="hero-section__badge">
          <SparklesIcon size={16} />
          <span>AI 메뉴 추천</span>
        </div>
        <h2 className="hero-section__title">오늘은 뭘 먹을까요?</h2>
        <p className="hero-section__desc">
          인원, 예산, 알레르기를 알려주면<br />AI가 가장 적합한 메뉴를 찾아드려요.
        </p>
      </section>

      <section className="setup-form" aria-label="식사 조건 설정">
        <h3 className="setup-form__title">식사 조건</h3>

        <div className="setup-form__row">
          <div className="setup-form__label">
            <span className="setup-form__icon setup-form__icon--people" aria-hidden="true">👥</span>
            <div>
              <strong>인원</strong>
              <small>함께 식사하는 사람</small>
            </div>
          </div>
          <div className="stepper">
            <button onClick={() => onPeopleChange(Math.max(1, people - 1))} aria-label="인원 줄이기">−</button>
            <strong>{people}명</strong>
            <button onClick={() => onPeopleChange(Math.min(8, people + 1))} aria-label="인원 늘리기">＋</button>
          </div>
        </div>

        <div className="setup-form__row">
          <div className="setup-form__label">
            <span className="setup-form__icon setup-form__icon--budget" aria-hidden="true">💴</span>
            <div>
              <strong>총예산</strong>
              <small>현지 통화 기준</small>
            </div>
          </div>
          <label className="budget-input">
            <b>¥</b>
            <input
              type="number"
              min="1000"
              step="500"
              value={budget}
              onChange={(e) => onBudgetChange(Number(e.target.value))}
              aria-label="총예산"
            />
          </label>
        </div>

        <div className="setup-form__toggles">
          <button
            className={`option-toggle ${peanutAllergy ? "option-toggle--active option-toggle--danger" : ""}`}
            onClick={() => onPeanutChange(!peanutAllergy)}
            aria-pressed={peanutAllergy}
          >
            <span className="option-toggle__emoji">🥜</span>
            <div className="option-toggle__text">
              <strong>땅콩 알레르기</strong>
              <small>{peanutAllergy ? "적용 중" : "적용 안 함"}</small>
            </div>
            <span className="option-toggle__check">{peanutAllergy ? "✓" : "+"}</span>
          </button>
          <button
            className={`option-toggle ${avoidSpicy ? "option-toggle--active" : ""}`}
            onClick={() => onSpicyChange(!avoidSpicy)}
            aria-pressed={avoidSpicy}
          >
            <span className="option-toggle__emoji">🌶️</span>
            <div className="option-toggle__text">
              <strong>맵지 않게</strong>
              <small>{avoidSpicy ? "적용 중" : "적용 안 함"}</small>
            </div>
            <span className="option-toggle__check">{avoidSpicy ? "✓" : "+"}</span>
          </button>
        </div>
      </section>

      <label className="scan-button">
        <input type="file" accept="image/*" capture="environment" onChange={onImage} />
        <span className="scan-button__icon" aria-hidden="true">📷</span>
        <div className="scan-button__text">
          <strong>메뉴판 촬영하기</strong>
          <small>메뉴가 화면에 모두 들어오게 찍어주세요</small>
        </div>
        <span className="scan-button__arrow">→</span>
      </label>

      <button className="sample-link" onClick={onSample}>
        사진 없이 샘플 메뉴로 체험하기
      </button>

      <p className="safety-disclaimer">
        알레르기 분석은 참고용이며 실제 성분과 교차오염 여부는 직원에게 확인하세요.
      </p>
    </div>
  );
}

function AnalyzingScreen({ activeStep, previewUrl }: { activeStep: number; previewUrl: string | null }) {
  return (
    <div className="screen-content fade-in" aria-live="polite">
      <div className="analyzing-visual">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="촬영한 메뉴판 미리보기" className="analyzing-visual__img" />
        ) : (
          <div className="analyzing-visual__sample">
            <b>レストラン さくら</b>
            <span>豚骨ラーメン ¥1,000</span>
            <span>担々麺 ¥1,100</span>
            <span>焼き餃子 ¥600</span>
          </div>
        )}
        <div className="analyzing-visual__scanline" />
        <span className="analyzing-visual__chip">
          <SparklesIcon size={12} />
          AI 분석 중
        </span>
      </div>

      <div className="analyzing-copy">
        <h2>메뉴판을 이해하고 있어요</h2>
        <p>잠시만 기다리면 추천 조합을 보여드릴게요.</p>
      </div>

      <ol className="analysis-steps">
        {ANALYSIS_STEPS.map((step, i) => (
          <li
            key={step}
            className={`analysis-step ${i < activeStep ? "analysis-step--done" : i === activeStep ? "analysis-step--active" : ""}`}
          >
            <span className="analysis-step__number">
              {i < activeStep ? <CheckIcon size={12} /> : i + 1}
            </span>
            <p className="analysis-step__text">{step}</p>
            {i === activeStep && <span className="analysis-step__pulse" />}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ResultsScreen({
  condition,
  recommendedItems,
  menuItems,
  totalPrice,
  appState,
  onOrder,
  onRetry,
}: {
  condition: Condition;
  recommendedItems: { name: string; quantity: number; price: number; risk?: string; evidence?: string }[];
  menuItems: MockMenuItem[];
  totalPrice: number;
  appState: AppState;
  onOrder: () => void;
  onRetry: () => void;
}) {
  const [showAllMenus, setShowAllMenus] = useState(false);
  const excludedCount = condition.allergies.includes("땅콩")
    ? menuItems.filter((m) => m.risk === "danger").length
    : 0;

  if (appState === "loading") return <LoadingState />;
  if (appState === "error") return <ErrorState onRetry={onRetry} />;
  if (appState === "empty") return <EmptyState />;

  return (
    <div className="screen-content fade-in results-layout" aria-live="polite">
      {/* AI 분석 완료 배너 */}
      <section className="ai-banner">
        <div className="ai-banner__icon">
          <SparklesIcon size={20} />
        </div>
        <div className="ai-banner__content">
          <span className="ai-banner__label">AI 분석 완료</span>
          <h2 className="ai-banner__title">추천 메뉴 조합을 찾았어요</h2>
          <p className="ai-banner__desc">
            예산과 알레르기 조건을 고려해 추천했어요.
          </p>
        </div>
      </section>

      {/* 조건 요약 */}
      <ConditionSummary condition={condition} />

      {/* 위험 경고 */}
      {excludedCount > 0 && (
        <div className="allergy-alert" role="alert">
          <span className="allergy-alert__icon">🥜</span>
          <div className="allergy-alert__content">
            <strong>땅콩이 확인된 메뉴 {excludedCount}개 제외</strong>
            <p>탄탄멘과 피넛 냉두부는 추천에 포함하지 않았어요.</p>
          </div>
        </div>
      )}

      {/* AI 추천 결과 */}
      <section className="recommendation-section" aria-label="AI 추천 메뉴">
        <div className="recommendation-section__header">
          <h3>
            <SparklesIcon size={16} />
            AI 추천
          </h3>
          <span className="recommendation-section__match">조건 일치 96%</span>
        </div>
        <p className="recommendation-section__reason">
          {condition.people}명이 먹기 충분하고, {condition.allergies.join("과 ")} 메뉴를 제외했어요.
        </p>
        <div className="recommendation-section__cards">
          {recommendedItems.map((item) => (
            <RecommendationCard
              key={item.name}
              item={{
                ...item,
                risk: item.risk as "safe" | "caution" | "danger" | undefined,
              }}
            />
          ))}
        </div>
      </section>

      {/* 가격 요약 */}
      <PriceSummary
        totalPrice={totalPrice}
        people={condition.people}
        budget={condition.budget}
      />

      {/* 전체 메뉴 리스트 */}
      <section className="all-menus" aria-label="인식한 전체 메뉴">
        <div className="all-menus__header">
          <h3>인식한 메뉴</h3>
          <button
            className="all-menus__toggle"
            onClick={() => setShowAllMenus(!showAllMenus)}
          >
            {showAllMenus ? "접기" : "전체 보기"}
          </button>
        </div>
        <div className="all-menus__list">
          {(showAllMenus ? menuItems : menuItems.slice(0, 4)).map((item) => (
            <MenuItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* 주문 버튼 */}
      <button className="primary-cta" onClick={onOrder}>
        <UtensilsIcon size={18} />
        이 조합으로 주문하기
      </button>

      <p className="safety-disclaimer">
        ⚠️ 메뉴판에서 확인할 수 없는 조리유·교차오염 정보는 직원에게 확인하세요.
      </p>
    </div>
  );
}

function OrderScreen({
  condition,
  totalPrice,
  onRestart,
}: {
  condition: Condition;
  totalPrice: number;
  onRestart: () => void;
}) {
  return (
    <div className="screen-content fade-in" aria-live="polite">
      <section className="order-card">
        <span className="order-card__badge">🇯🇵 직원에게 이 화면을 보여주세요</span>
        <p className="order-card__japanese">
          豚骨ラーメンを一つ、<br />醤油ラーメンを一つ、<br />チャーシュー丼を一つ、<br />焼き餃子を一つお願いします。
        </p>
        <small className="order-card__korean">
          돈코츠라멘 하나, 쇼유라멘 하나, 차슈덮밥 하나, 교자 하나 주세요.
        </small>
      </section>

      {condition.allergies.includes("땅콩") && (
        <section className="allergy-phrase" aria-label="알레르기 확인 문장">
          <div className="allergy-phrase__header">
            <span>🥜</span>
            <div>
              <small>ALLERGY CHECK</small>
              <h3>알레르기 확인 문장</h3>
            </div>
          </div>
          <blockquote className="allergy-phrase__quote">
            落花生アレルギーがあります。<br />料理やソースに落花生が含まれていますか？
          </blockquote>
          <p className="allergy-phrase__translation">
            땅콩 알레르기가 있습니다. 음식이나 소스에 땅콩이 들어가나요?
          </p>
          <button
            className="allergy-phrase__copy"
            onClick={() => navigator.clipboard?.writeText(
              "落花生アレルギーがあります。料理やソースに落花生が含まれていますか？"
            )}
          >
            문장 복사하기
          </button>
        </section>
      )}

      <SplitBillCard totalPrice={totalPrice} people={condition.people} />

      <button className="primary-cta primary-cta--outline" onClick={onRestart}>
        처음부터 다시 체험하기
      </button>

      <p className="safety-disclaimer">
        Safe Plate의 분석은 참고용입니다. 알레르기와 교차오염 여부는 반드시 식당에 직접 확인하세요.
      </p>
    </div>
  );
}
