"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  type AllergyItem,
  ALLERGY_DATABASE,
  ALLERGY_CATEGORIES,
  searchAllergies,
  getAllergiesByCategory,
} from "./allergy-data";
import type {
  AnalyzedMenuItem,
  MenuAnalysisError,
  MenuAnalysisResult,
  SpicyLevel,
} from "../lib/gemini-menu-analysis";
import { getMenuImage, type MenuImage } from "../lib/menu-image";
import type {
  MenuRecommendationError,
  MenuRecommendationResponse,
  MenuRecommendationSuccess,
} from "../lib/menu-recommendation";
import {
  MENU_RISK_LABELS,
  menuConflictsWithSelectedConditions,
  resolveMenuRiskLevel,
} from "../lib/menu-recommendation";
import { ConditionSummary } from "./components/ConditionSummary";
import {
  buildAllergyCheckPhrase,
  buildOrderPhrase,
  mergeRecommendationQuantities,
} from "../lib/order-display";

type Screen = "setup" | "analyzing" | "results" | "order";
type MenuPhotoState =
  | { status: "idle" | "loading" | "not-found" | "error" }
  | { status: "ready"; image: MenuImage };
type RecommendationViewState =
  | { status: "idle" | "loading" }
  | { status: "success"; result: MenuRecommendationSuccess }
  | { status: "error"; result: MenuRecommendationError };

const MAX_SOURCE_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_UPLOAD_IMAGE_BYTES = 10 * 1024 * 1024;
const RESIZE_THRESHOLD_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2_200;
const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);
const GEMINI_UPLOAD_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ANALYSIS_STEPS = [
  "메뉴판의 글자를 읽고 있어요",
  "메뉴명과 가격을 정리하고 있어요",
  "재료와 알레르기 가능성을 확인하고 있어요",
  "한국어 메뉴 정보로 정리하고 있어요",
];

const SPICY_LABELS: Record<SpicyLevel, string> = {
  none: "맵지 않음",
  mild: "약간 매움",
  medium: "보통 매움",
  hot: "매움",
  unknown: "확인 불가",
};

const DIETARY_RESTRICTION_IDS = new Set([
  "pork",
  "beef",
  "chicken",
  "lamb",
  "duck",
  "alcohol",
  "caffeine",
  "honey",
  "spicy",
  "raw_food",
  "fermented",
]);

export default function Home() {
  const [screen, setScreen] = useState<Screen>("setup");
  const [people, setPeople] = useState(3);
  const [budget, setBudget] = useState(4000);
  const [selectedAllergies, setSelectedAllergies] = useState<AllergyItem[]>([
    ALLERGY_DATABASE.find((a) => a.id === "peanut")!,
  ]);
  const [avoidSpicy, setAvoidSpicy] = useState(true);
  const [isSample, setIsSample] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<MenuAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const abortController = useRef<AbortController | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
      abortController.current?.abort();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  async function startAnalysis(file: File) {
    timers.current.forEach(clearTimeout);
    abortController.current?.abort();

    const validationError = validateImage(file);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextPreviewUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
    setAnalysis(null);
    setErrorMessage(null);
    setAnalysisStep(0);
    setSelectedQuantities({});
    setIsSample(false);
    setScreen("analyzing");

    [900, 1_800, 2_700].forEach((delay, index) => {
      timers.current.push(setTimeout(() => setAnalysisStep(index + 1), delay));
    });

    const controller = new AbortController();
    abortController.current = controller;

    try {
      const uploadImage = await optimizeImage(file);
      if (!GEMINI_UPLOAD_IMAGE_TYPES.has(uploadImage.type)) {
        throw new Error(
          "이 사진 형식을 변환하지 못했습니다. 카메라로 다시 촬영하거나 JPEG로 선택해주세요.",
        );
      }
      if (uploadImage.size > MAX_UPLOAD_IMAGE_BYTES) {
        throw new Error(
          "사진 용량을 충분히 줄이지 못했습니다. 메뉴판에 더 가까이 다가가 다시 촬영해주세요.",
        );
      }
      const formData = new FormData();
      formData.append("image", uploadImage, uploadImage.name || "menu-image.jpg");
      formData.append("response_language", "ko");

      const response = await fetch("/api/analyze-menu", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => null)) as
        | MenuAnalysisResult
        | MenuAnalysisError
        | null;

      if (!payload) {
        throw new Error("Gemini 응답을 읽지 못했습니다. 다시 시도해주세요.");
      }
      if (!response.ok || payload.success === false) {
        throw new Error(
          payload.success === false
            ? payload.error
            : "메뉴판 분석에 실패했습니다. 잠시 후 다시 시도해주세요.",
        );
      }
      if (!Array.isArray(payload.menus) || payload.menus.length === 0) {
        throw new Error(
          "메뉴판 글자가 잘 보이지 않습니다. 메뉴판 전체가 선명하게 보이도록 다시 촬영해주세요.",
        );
      }

      setAnalysis(payload);
      setAnalysisStep(ANALYSIS_STEPS.length - 1);
      setScreen("results");
    } catch (error) {
      if (controller.signal.aborted) return;
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "네트워크 오류가 발생했습니다. 연결을 확인하고 다시 시도해주세요.",
      );
      setScreen("setup");
    } finally {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      if (abortController.current === controller) abortController.current = null;
    }
  }

  function startSampleDemo() {
    timers.current.forEach(clearTimeout);
    abortController.current?.abort();
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewUrl(null);
    setErrorMessage(null);
    setSelectedQuantities({});
    setAnalysis(createSampleAnalysis());
    setIsSample(true);
    setScreen("results");
  }

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      setErrorMessage("분석할 메뉴판 사진을 선택해주세요.");
      return;
    }
    void startAnalysis(file);
  }

  function resetAnalysis() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    abortController.current?.abort();
    abortController.current = null;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewUrl(null);
    setAnalysis(null);
    setAnalysisStep(0);
    setErrorMessage(null);
    setSelectedQuantities({});
    setIsSample(false);
    setScreen("setup");
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <section className="phone-frame" aria-live="polite">
        <AppHeader
          screen={screen}
          isSample={isSample}
          onBack={
            screen === "setup"
              ? undefined
              : screen === "order"
                ? () => setScreen("results")
                : resetAnalysis
          }
        />

        {screen === "setup" && (
          <SetupScreen
            people={people}
            budget={budget}
            selectedAllergies={selectedAllergies}
            avoidSpicy={avoidSpicy}
            errorMessage={errorMessage}
            onPeopleChange={setPeople}
            onBudgetChange={setBudget}
            onAllergiesChange={setSelectedAllergies}
            onSpicyChange={setAvoidSpicy}
            onImage={handleImage}
            onSample={startSampleDemo}
          />
        )}

        {screen === "analyzing" && (
          <AnalyzingScreen activeStep={analysisStep} previewUrl={previewUrl} />
        )}

        {screen === "results" && analysis && (
          <ResultsScreen
            analysis={analysis}
            people={people}
            budget={budget}
            selectedAllergies={selectedAllergies}
            avoidSpicy={avoidSpicy}
            selectedQuantities={selectedQuantities}
            onSelectedQuantitiesChange={setSelectedQuantities}
            previewUrl={previewUrl}
            onOrder={() => setScreen("order")}
            onRestart={resetAnalysis}
          />
        )}

        {screen === "order" && analysis && (
          <OrderScreen
            analysis={analysis}
            people={people}
            selectedAllergies={selectedAllergies}
            selectedQuantities={selectedQuantities}
            onSelectedQuantitiesChange={setSelectedQuantities}
            onBack={() => setScreen("results")}
            onRestart={resetAnalysis}
          />
        )}
      </section>
    </main>
  );
}

function AppHeader({ screen, isSample, onBack }: { screen: Screen; isSample: boolean; onBack?: () => void }) {
  return (
    <header className="topbar">
      {onBack ? (
        <button className="icon-button" onClick={onBack} aria-label="처음으로 돌아가기">←</button>
      ) : (
        <div className="brand-mark" aria-hidden="true">SP</div>
      )}
      <div className="brand-copy">
        <p className="eyebrow">AI DINING COPILOT</p>
        <h1>Safe Plate</h1>
      </div>
      <span className="demo-pill">{isSample ? "SAMPLE" : "GEMINI AI"}</span>
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
  avoidSpicy,
  errorMessage,
  onPeopleChange,
  onBudgetChange,
  onAllergiesChange,
  onSpicyChange,
  onImage,
  onSample,
}: {
  people: number;
  budget: number;
  selectedAllergies: AllergyItem[];
  avoidSpicy: boolean;
  errorMessage: string | null;
  onPeopleChange: (value: number) => void;
  onBudgetChange: (value: number) => void;
  onAllergiesChange: (value: AllergyItem[]) => void;
  onSpicyChange: (value: boolean) => void;
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
        <p className="step-label">SCAN · UNDERSTAND · CHOOSE</p>
        <h2>낯선 메뉴도,<br />한 번에 이해하세요.</h2>
        <p>메뉴판을 촬영하면 AI가 원문, 한국어 설명, 가격과 주의 정보를 정리해드려요.</p>
        <div className="country-badge"><span>📷</span><div><small>실시간 기능</small><strong>Gemini 메뉴 분석</strong></div></div>
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
          <div className="budget-input"><b>¥</b><input type="number" min="1000" step="500" value={budget} onChange={(event) => onBudgetChange(Number(event.target.value))} aria-label="총예산" /></div>
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
              <p>&ldquo;{allergySearch}&rdquo;에 대한 결과가 없습니다</p>
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

        <button className={avoidSpicy ? "option-toggle active spicy-toggle" : "option-toggle spicy-toggle"} onClick={() => onSpicyChange(!avoidSpicy)} aria-pressed={avoidSpicy}>
          <span>🌶️</span><div><strong>맵지 않게</strong><small>{avoidSpicy ? "추천에서 매운 메뉴 제외" : "매운 메뉴도 허용"}</small></div><i>{avoidSpicy ? "✓" : "+"}</i>
        </button>
      </section>

      {errorMessage && <div className="error-card" role="alert"><span>!</span><p>{errorMessage}</p></div>}

      <div className="upload-actions">
        <label className="scan-card">
          <input type="file" accept="image/*" capture="environment" onChange={onImage} />
          <span className="camera-icon" aria-hidden="true">▣</span>
          <div><strong>카메라로 촬영하기</strong><small>메뉴판 전체가 보이게 찍어주세요</small></div>
          <b>→</b>
        </label>
        <label className="library-card">
          <input type="file" accept="image/*" onChange={onImage} />
          <span aria-hidden="true">▧</span>
          <div><strong>사진 보관함에서 선택</strong><small>큰 사진은 글자를 보존해 자동 최적화해요</small></div>
        </label>
      </div>
      <button className="sample-button" type="button" onClick={onSample}>사진 없이 샘플 메뉴로 체험하기 (SAMPLE)</button>
      <p className="safety-note">AI가 추정한 정보이며 실제 재료와 조리 과정은 매장에 확인하세요.</p>
    </div>
  );
}

function AnalyzingScreen({ activeStep, previewUrl }: { activeStep: number; previewUrl: string | null }) {
  return (
    <div className="screen-content analyzing-screen enter-animation">
      <div className="photo-stage">
        {previewUrl && (
          // 선택한 로컬 Blob URL은 Next 이미지 최적화 대상이 아닙니다.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="선택한 메뉴판 미리보기" />
        )}
        <div className="scan-line" />
        <span className="ai-chip">Gemini 분석 중</span>
      </div>
      <div className="analysis-copy">
        <p className="step-label">MENU UNDERSTANDING</p>
        <h2>메뉴판을 이해하고 있어요</h2>
        <p>사진의 글자와 주의 정보를 확인하고 있습니다.</p>
      </div>
      <ol className="analysis-list">
        {ANALYSIS_STEPS.map((step, index) => (
          <li key={step} className={index < activeStep ? "done" : index === activeStep ? "active" : ""}>
            <span>{index < activeStep ? "✓" : index + 1}</span><p>{step}</p>{index === activeStep && <i />}
          </li>
        ))}
      </ol>
      <div className="ai-notice"><b>실제 AI 분석</b><span>사진은 서버에서 Gemini API로 전송되며 API Key는 브라우저에 노출되지 않습니다.</span></div>
    </div>
  );
}

function ResultsScreen({
  analysis,
  people,
  budget,
  selectedAllergies,
  avoidSpicy,
  selectedQuantities,
  onSelectedQuantitiesChange,
  previewUrl,
  onOrder,
  onRestart,
}: {
  analysis: MenuAnalysisResult;
  people: number;
  budget: number;
  selectedAllergies: AllergyItem[];
  avoidSpicy: boolean;
  selectedQuantities: Record<string, number>;
  onSelectedQuantitiesChange: (value: Record<string, number>) => void;
  previewUrl: string | null;
  onOrder: () => void;
  onRestart: () => void;
}) {
  const selectedConditionNames = selectedAllergies.map((item) => item.name);
  const matchingMenuCount = analysis.menus.filter((menu) =>
    menuConflictsWithSelectedConditions(menu, selectedAllergies),
  ).length;
  const [recommendationOpen, setRecommendationOpen] = useState(false);
  const [recommendationState, setRecommendationState] =
    useState<RecommendationViewState>({ status: "idle" });
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);
  const recommendationRequestActive = useRef(false);
  const recommendationAbortController = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => recommendationAbortController.current?.abort();
  }, []);

  async function requestRecommendation(useAlternative = false) {
    if (recommendationRequestActive.current) return;
    recommendationRequestActive.current = true;
    setRecommendationOpen(true);
    setRecommendationState({ status: "loading" });

    const controller = new AbortController();
    recommendationAbortController.current = controller;
    const previousCombination =
      useAlternative && recommendationState.status === "success"
        ? recommendationState.result.recommendation.items.map(({ menu_id, quantity }) => ({
            menu_id,
            quantity,
          }))
        : undefined;
    const conditions = partitionSelectedConditions(selectedAllergies);

    try {
      const response = await fetch("/api/recommend-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conditions: {
            people,
            budget,
            allergies: conditions.allergies,
            dietary_restrictions: conditions.dietaryRestrictions,
            avoid_spicy: avoidSpicy,
          },
          menus: analysis.menus,
          previous_combination: previousCombination,
        }),
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => null)) as
        | MenuRecommendationResponse
        | null;

      if (!payload || typeof payload.success !== "boolean") {
        throw new Error("AI 추천 응답을 읽지 못했습니다. 다시 시도해주세요.");
      }
      if (!response.ok || payload.success === false) {
        setRecommendationState({
          status: "error",
          result:
            payload.success === false
              ? payload
              : { success: false, error: "AI 메뉴 조합 추천에 실패했습니다." },
        });
        return;
      }
      setRecommendationState({ status: "success", result: payload });
    } catch (error) {
      if (controller.signal.aborted) return;
      setRecommendationState({
        status: "error",
        result: {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "네트워크 오류가 발생했습니다. 연결을 확인해주세요.",
        },
      });
    } finally {
      recommendationRequestActive.current = false;
      if (recommendationAbortController.current === controller) {
        recommendationAbortController.current = null;
      }
    }
  }

  function applyRecommendation(result: MenuRecommendationSuccess) {
    try {
      const hasMismatchedMenu = result.recommendation.items.some((item) => {
        const match = /^menu-(\d+)$/.exec(item.menu_id);
        const menu = match ? analysis.menus[Number(match[1])] : undefined;
        return (
          !menu ||
          menu.original_name !== item.original_name ||
          menu.korean_name !== item.korean_name ||
          menu.price !== item.unit_price
        );
      });
      if (hasMismatchedMenu) {
        throw new Error("추천 결과가 현재 분석한 메뉴와 일치하지 않아 주문에 추가하지 않았어요.");
      }
      const next = mergeRecommendationQuantities(
        selectedQuantities,
        result.recommendation.items,
        analysis.menus.length,
      );
      onSelectedQuantitiesChange(next);
      setSelectionMessage(null);
      setRecommendationOpen(false);
      onOrder();
    } catch (error) {
      setRecommendationState({
        status: "error",
        result: {
          success: false,
          error: error instanceof Error ? error.message : "추천 메뉴를 주문에 추가하지 못했어요.",
          code: "INVALID_AI_SELECTION",
        },
      });
    }
  }

  const selectedMenus = Object.entries(selectedQuantities).flatMap(
    ([menuId, quantity]) => {
      const index = Number(menuId.replace("menu-", ""));
      const menu = analysis.menus[index];
      if (!menu || menu.price === null) return [];
      return [{ menuId, menu, quantity, subtotal: menu.price * quantity }];
    },
  );
  const selectedTotal = selectedMenus.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <div className="screen-content enter-animation results-screen">
      <section className="result-summary">
        <div className="result-icon">✓</div>
        <div className="result-summary-copy">
          <p>분석 완료</p>
          <div className="result-title-row">
            <h2>{analysis.menus.length}개 메뉴를 찾았어요</h2>
            <button
              type="button"
              className="ai-combination-button"
              onClick={() => void requestRecommendation()}
              disabled={recommendationState.status === "loading"}
              aria-haspopup="dialog"
            >
              AI 조합 추천
            </button>
          </div>
          <span>{people}명 · 예산 ¥{budget.toLocaleString()} · 알레르기/제한 {selectedAllergies.length}개 · {analysis.detected_language ?? "언어 자동 감지"}</span>
        </div>
        {previewUrl && (
          // 선택한 로컬 Blob URL은 Next 이미지 최적화 대상이 아닙니다.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="분석한 메뉴판" />
        )}
      </section>

      <ConditionSummary
        condition={{
          people,
          budget,
          allergies: selectedAllergies.map((item) => item.name),
        }}
      />

      {selectedAllergies.length > 0 && (
        <div className="alert-card"><span>⚠️</span><div><strong>{matchingMenuCount > 0 ? `선택 조건 관련 가능성 ${matchingMenuCount}개 발견` : "선택 조건과 직접 일치하는 표기를 찾지 못했어요"}</strong><p>{selectedConditionNames.join(", ")} 조건은 추천에서 우선 제외합니다. 표기가 없더라도 반드시 직원에게 확인하세요.</p></div></div>
      )}

      {analysis.warnings.map((warning, index) => (
        <div className="analysis-warning" role="note" key={`${warning}-${index}`}>⚠️ {warning}</div>
      ))}

      <div className="section-heading menu-heading"><div><p>RECOGNIZED MENU</p><h3>인식한 메뉴</h3></div><span>{avoidSpicy ? "매운맛 확인" : "전체 결과"}</span></div>
      <div className="menu-list detailed-menu-list">
        {analysis.menus.map((item, index) => (
          <MenuCard
            item={item}
            index={index}
            selectedAllergies={selectedAllergies}
            key={`${item.original_name}-${index}`}
          />
        ))}
      </div>

      {selectedMenus.length > 0 && (
        <section className="selected-combination" aria-label="선택한 메뉴">
          <div className="section-heading">
            <div><p>SELECTED MENU</p><h3>선택한 메뉴</h3></div>
            <strong>{formatPrice(selectedTotal, selectedMenus[0]?.menu.currency ?? "JPY")}</strong>
          </div>
          <div className="selected-combination-list">
            {selectedMenus.map(({ menuId, menu, quantity, subtotal }) => (
              <div key={menuId}>
                <span>{menu.korean_name || menu.original_name}</span>
                <small>{quantity}개</small>
                <b>{formatPrice(subtotal, menu.currency)}</b>
              </div>
            ))}
          </div>
          {selectionMessage && <p role="status">✓ {selectionMessage}</p>}
          <button type="button" className="primary-button selected-order-button" onClick={onOrder}>선택한 조합으로 주문하기 <span>→</span></button>
        </section>
      )}

      <button className="primary-button" onClick={onRestart}>다른 메뉴판 분석하기 <span>→</span></button>
      <p className="safety-note">⚠️ AI가 추정한 정보이며 실제 재료·알레르기·조리 과정은 매장에 확인하세요.</p>
      {recommendationOpen && typeof document !== "undefined" &&
        createPortal(
          <RecommendationPopup
            state={recommendationState}
            people={people}
            budget={budget}
            onClose={() => setRecommendationOpen(false)}
            onRetry={() => void requestRecommendation()}
            onAlternative={() => void requestRecommendation(true)}
            onSelect={applyRecommendation}
          />,
          document.body,
        )}
    </div>
  );
}

function OrderScreen({
  analysis,
  people,
  selectedAllergies,
  selectedQuantities,
  onSelectedQuantitiesChange,
  onBack,
  onRestart,
}: {
  analysis: MenuAnalysisResult;
  people: number;
  selectedAllergies: AllergyItem[];
  selectedQuantities: Record<string, number>;
  onSelectedQuantitiesChange: (value: Record<string, number>) => void;
  onBack: () => void;
  onRestart: () => void;
}) {
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const selectedMenus = getSelectedMenus(analysis, selectedQuantities);
  const total = selectedMenus.reduce((sum, item) => sum + item.subtotal, 0);
  const currency = selectedMenus[0]?.menu.currency ?? "JPY";
  const splitAmounts = splitTotal(total, people);
  const orderText = buildOrderPhrase({
    language: analysis.detected_language,
    items: selectedMenus.map(({ menu, quantity }) => ({
      originalName: menu.original_name,
      koreanName: menu.korean_name,
      quantity,
    })),
  });
  const allergyQuestion = buildAllergyCheckPhrase({
    language: analysis.detected_language,
    allergies: selectedAllergies.map((item) => ({
      koreanName: item.name,
      englishName: item.nameEn,
      localName: getJapaneseAllergyName(item),
    })),
  });

  function changeQuantity(menuId: string, delta: number) {
    const next = { ...selectedQuantities };
    const quantity = Math.max(1, (next[menuId] ?? 0) + delta);
    next[menuId] = quantity;
    onSelectedQuantitiesChange(next);
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage(`${label}을 복사했어요.`);
    } catch {
      setCopyMessage("복사하지 못했습니다. 문장을 길게 눌러 복사해주세요.");
    }
  }

  return (
    <div className="screen-content enter-animation order-screen">
      <section className="order-hero">
        <span>注文はこちらです · 직원에게 이 화면을 보여주세요</span>
        <p>{orderText.local.split("\n").map((line, index) => <span key={`${line}-${index}`}>{line}{index < orderText.local.split("\n").length - 1 && <br />}</span>)}</p>
        <small>{orderText.korean}</small>
        <button type="button" className="order-copy-button" onClick={() => void copyText(orderText.local, "주문 문장")}>주문 문장 복사하기</button>
      </section>

      <section className="selected-combination order-selection" aria-label="주문 메뉴">
        <div className="section-heading"><div><p>ORDER MENU</p><h3>주문할 메뉴</h3></div><strong>{formatPrice(total, currency)}</strong></div>
        <div className="selected-combination-list">
          {selectedMenus.map(({ menuId, menu, quantity, subtotal }) => (
            <div key={menuId}>
              <span>{menu.korean_name || menu.original_name}</span>
              <div className="order-quantity-controls" aria-label={`${menu.korean_name || menu.original_name} 수량`}>
                <button type="button" onClick={() => changeQuantity(menuId, -1)} aria-label="수량 줄이기">−</button>
                <small>{quantity}개</small>
                <button type="button" onClick={() => changeQuantity(menuId, 1)} aria-label="수량 늘리기">+</button>
              </div>
              <b>{formatPrice(subtotal, menu.currency)}</b>
            </div>
          ))}
        </div>
      </section>

      {selectedAllergies.length > 0 && (
        <section className="allergy-question">
          <div className="question-title"><span>⚠️</span><div><p>ALLERGY CHECK</p><h3>알레르기·식이제한 확인 문장</h3></div></div>
          <blockquote>{allergyQuestion.local}</blockquote>
          <p>{allergyQuestion.korean}</p>
          <button type="button" onClick={() => void copyText(allergyQuestion.local, "확인 문장")}>문장 복사하기</button>
        </section>
      )}

      <section className="split-card">
        <div className="section-heading"><div><p>SPLIT THE BILL</p><h3>더치페이</h3></div><strong>총 {formatPrice(total, currency)}</strong></div>
        <div className="split-list">
          {splitAmounts.map((amount, index) => <div key={index}><span>{String.fromCharCode(65 + index)}</span><p>{index + 1}번째 사람</p><strong>{formatPrice(amount, currency)}</strong></div>)}
        </div>
      </section>

      {copyMessage && <p className="copy-message" role="status">{copyMessage}</p>}
      <div className="order-navigation-actions">
        <button type="button" className="secondary-order-button" onClick={onBack}>이전으로</button>
        <button type="button" className="secondary-order-button" onClick={onBack}>주문 수정하기</button>
      </div>
      <button className="primary-button" onClick={onRestart}>처음부터 다시 시작하기</button>
      <p className="safety-note">알레르기 정보는 AI 분석 결과이므로 주문 전 매장에 다시 확인해주세요.</p>
    </div>
  );
}

function RecommendationPopup({
  state,
  people,
  budget,
  onClose,
  onRetry,
  onAlternative,
  onSelect,
}: {
  state: RecommendationViewState;
  people: number;
  budget: number;
  onClose: () => void;
  onRetry: () => void;
  onAlternative: () => void;
  onSelect: (result: MenuRecommendationSuccess) => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const recommendation = state.status === "success" ? state.result.recommendation : null;

  return (
    <div className="recommendation-backdrop" role="presentation">
      <button
        type="button"
        className="recommendation-dismiss-layer"
        aria-label="AI 추천 닫기"
        onClick={onClose}
      />
      <section
        className="recommendation-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recommendation-title"
      >
        <div className="recommendation-handle" aria-hidden="true" />
        <div className="recommendation-header">
          <div>
            <p>GEMINI PICK</p>
            <h2 id="recommendation-title">AI 추천 조합</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="AI 추천 닫기">×</button>
        </div>

        {state.status === "loading" && (
          <div className="recommendation-loading" role="status">
            <span className="menu-photo-spinner" aria-hidden="true" />
            <strong>AI가 메뉴 조합을 고르고 있어요...</strong>
            <p>알레르기, 총예산과 인원수를 함께 확인하고 있어요.</p>
          </div>
        )}

        {state.status === "error" && (
          <div className="recommendation-error" role="alert">
            <span aria-hidden="true">🍽️</span>
            <strong>{state.result.error}</strong>
            {typeof state.result.minimum_additional_budget === "number" && (
              <p>
                예산을 {formatPrice(state.result.minimum_additional_budget, "JPY")} 늘리면
                인원수에 맞는 최소 조합을 선택할 수 있어요.
              </p>
            )}
            <button type="button" onClick={onRetry}>다시 추천받기</button>
          </div>
        )}

        {state.status === "success" && recommendation && (
          <>
            <p className="recommendation-intro">
              {people}명이 {formatPrice(budget, recommendation.currency)} 이내에서 먹기 좋은 조합이에요.
            </p>
            <ol className="recommendation-items">
              {recommendation.items.map((item) => (
                <li key={item.menu_id}>
                  <div>
                    <strong>{item.korean_name || item.original_name}</strong>
                    <small>{formatPrice(item.unit_price, item.currency)} × {item.quantity}개</small>
                  </div>
                  <b>{formatPrice(item.subtotal, item.currency)}</b>
                </li>
              ))}
            </ol>
            <div className="recommendation-budget">
              <div><span>총 금액</span><strong>{formatPrice(recommendation.total_price, recommendation.currency)} / {formatPrice(recommendation.total_budget, recommendation.currency)}</strong></div>
              <div><span>남은 예산</span><strong>{formatPrice(recommendation.remaining_budget, recommendation.currency)}</strong></div>
            </div>
            <div className="recommendation-reason">
              <strong>추천 이유</strong>
              <p>{recommendation.reason}</p>
            </div>
            <p className="recommendation-allergy-note">
              알레르기 정보는 AI 분석 결과이므로 주문 전 매장에 다시 확인해주세요.
            </p>
            {state.result.message && <p className="recommendation-message" role="status">{state.result.message}</p>}
            <div className="recommendation-actions">
              <button type="button" className="secondary-recommendation-button" onClick={onAlternative} disabled={!state.result.has_alternative}>
                다른 조합 보기
              </button>
              <button type="button" className="select-recommendation-button" onClick={() => onSelect(state.result)}>
                이 메뉴로 주문하기
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function MenuCard({
  item,
  index,
  selectedAllergies,
}: {
  item: AnalyzedMenuItem;
  index: number;
  selectedAllergies: AllergyItem[];
}) {
  const risk = resolveMenuRiskLevel(item, selectedAllergies);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoState, setPhotoState] = useState<MenuPhotoState>({ status: "idle" });

  async function openPhoto() {
    setPhotoOpen(true);
    if (
      photoState.status === "loading" ||
      photoState.status === "ready" ||
      photoState.status === "not-found"
    ) {
      return;
    }

    setPhotoState({ status: "loading" });
    try {
      const image = await getMenuImage(item.original_name, item.korean_name);
      setPhotoState(image ? { status: "ready", image } : { status: "not-found" });
    } catch {
      setPhotoState({ status: "error" });
    }
  }

  return (
    <article className="menu-item detailed-menu-item">
      <div className="menu-title-row">
        <div
          className={`risk-dot ${risk}`}
          role="img"
          aria-label={MENU_RISK_LABELS[risk]}
          title={MENU_RISK_LABELS[risk]}
        />
        <div className="menu-copy">
          <small>{item.original_name || `메뉴 ${index + 1}`}</small>
          <div className="menu-name-row">
            <strong>{item.korean_name || item.original_name}</strong>
            <button
              type="button"
              className="menu-photo-button"
              onClick={() => void openPhoto()}
              aria-haspopup="dialog"
              aria-expanded={photoOpen}
            >
              사진 보기
            </button>
          </div>
        </div>
        <b>{formatPrice(item.price, item.currency)}</b>
      </div>
      <p className="menu-description">{item.korean_description || "음식 설명을 확인할 수 없습니다."}</p>
      {item.original_description && <p className="original-description">원문 설명 · {item.original_description}</p>}
      <div className="menu-detail-grid">
        <DetailRow label="대표 재료" value={item.ingredients.length ? item.ingredients.join(", ") : "확인 불가"} tone="neutral" />
        <DetailRow label="알레르기" value={item.allergens.length ? item.allergens.join(", ") : "확인 불가"} tone={risk === "danger" ? "danger" : "caution"} />
        <DetailRow label="매운맛" value={SPICY_LABELS[item.spicy_level]} tone={item.spicy_level === "hot" ? "danger" : "neutral"} />
        <DetailRow label="분류" value={item.category} tone="neutral" />
      </div>
      {photoOpen && typeof document !== "undefined" &&
        createPortal(
          <MenuPhotoPopup
            menuName={item.korean_name || item.original_name || `메뉴 ${index + 1}`}
            state={photoState}
            onClose={() => setPhotoOpen(false)}
            onImageError={() => setPhotoState({ status: "not-found" })}
          />,
          document.body,
        )}
    </article>
  );
}

function MenuPhotoPopup({
  menuName,
  state,
  onClose,
  onImageError,
}: {
  menuName: string;
  state: MenuPhotoState;
  onClose: () => void;
  onImageError: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="menu-photo-backdrop" role="presentation">
      <button
        type="button"
        className="menu-photo-dismiss-layer"
        aria-label="사진 닫기"
        onClick={onClose}
      />
      <div
        className="menu-photo-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`${menuName} 대표 사진`}
      >
        {state.status === "loading" && (
          <div className="menu-photo-status" role="status">
            <span className="menu-photo-spinner" aria-hidden="true" />
            <p>대표 사진을 찾고 있어요.</p>
          </div>
        )}

        {(state.status === "not-found" || state.status === "error") && (
          <div className="menu-photo-status" role="status">
            <span aria-hidden="true">🍽️</span>
            <p>대표 이미지를 찾지 못했어요.</p>
          </div>
        )}

        {state.status === "ready" && (
          <>
            {/* Wikimedia의 외부 썸네일은 버튼을 누른 뒤에만 렌더링합니다. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.image.url}
              alt={state.image.alt}
              loading="lazy"
              decoding="async"
              onError={onImageError}
            />
            <div className="menu-photo-caption">
              <strong>{menuName}</strong>
              <small>
                출처 · {state.image.attribution}
                {state.image.license ? ` · ${state.image.license}` : ""}
              </small>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value, tone }: { label: string; value: string; tone: "neutral" | "caution" | "danger" }) {
  return <div className={`detail-row ${tone}`}><span>{label}</span><p>{value}</p></div>;
}

function validateImage(file: File): string | null {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    return "JPEG, PNG, WebP 또는 GIF 이미지를 선택해주세요.";
  }
  if (file.size === 0) return "선택한 이미지가 비어 있습니다.";
  if (file.size > MAX_SOURCE_IMAGE_BYTES) return "원본 이미지 크기는 25MB 이하여야 합니다.";
  return null;
}

async function optimizeImage(file: File): Promise<File> {
  if (file.type === "image/gif" || typeof createImageBitmap !== "function") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );
    if (scale === 1 && file.size <= RESIZE_THRESHOLD_BYTES) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (!blob) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "menu"}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

function formatPrice(price: number | null, currency: string | null): string {
  if (price === null) return "가격 확인 불가";
  if (!currency) return price.toLocaleString();
  try {
    return new Intl.NumberFormat("ko-KR", { style: "currency", currency }).format(price);
  } catch {
    return `${price.toLocaleString()} ${currency}`;
  }
}

function partitionSelectedConditions(selected: AllergyItem[]) {
  const allergies: string[] = [];
  const dietaryRestrictions: string[] = [];
  for (const item of selected) {
    if (DIETARY_RESTRICTION_IDS.has(item.id)) dietaryRestrictions.push(item.name);
    else allergies.push(item.name);
  }
  return { allergies, dietaryRestrictions };
}

function getSelectedMenus(
  analysis: MenuAnalysisResult,
  selectedQuantities: Record<string, number>,
) {
  return Object.entries(selectedQuantities).flatMap(([menuId, quantity]) => {
    const index = Number(menuId.replace("menu-", ""));
    const menu = analysis.menus[index];
    if (!menu || menu.price === null || quantity <= 0) return [];
    return [{ menuId, menu, quantity, subtotal: menu.price * quantity }];
  });
}

function splitTotal(total: number, people: number): number[] {
  const safePeople = Math.max(1, Math.floor(people));
  const base = Math.floor(total / safePeople);
  const remainder = Math.round(total - base * safePeople);
  return Array.from({ length: safePeople }, (_, index) => base + (index < remainder ? 1 : 0));
}

function getJapaneseAllergyName(item: AllergyItem): string | undefined {
  return item.keywords.find((keyword) => /[ぁ-んァ-ヶ一-龠]/.test(keyword));
}

function createSampleAnalysis(): MenuAnalysisResult {
  return {
    success: true,
    detected_language: "ja",
    restaurant_context: "MenuMate 명시적 샘플 메뉴",
    menus: [
      sampleMenu("えのきうどん", "팽이버섯 우동", 430, ["우동면", "팽이버섯"], ["밀", "대두"], "noodle"),
      sampleMenu("きつねうどん", "유부 우동", 520, ["우동면", "유부"], ["밀", "대두"], "noodle"),
      sampleMenu("醤油ラーメン", "간장 라멘", 850, ["면", "간장", "돼지고기"], ["밀", "대두"], "noodle"),
      sampleMenu("親子丼", "오야코동", 780, ["닭고기", "달걀", "쌀"], ["달걀", "대두"], "rice"),
      sampleMenu("焼めし〈並〉", "볶음밥", 650, ["쌀", "달걀"], ["달걀", "대두"], "rice"),
    ],
    warnings: ["SAMPLE 버튼으로 연 명시적 데모 데이터입니다. 실제 사진 분석 결과가 아닙니다."],
  };
}

function sampleMenu(
  originalName: string,
  koreanName: string,
  price: number,
  ingredients: string[],
  allergens: string[],
  category: AnalyzedMenuItem["category"],
): AnalyzedMenuItem {
  return {
    original_name: originalName,
    korean_name: koreanName,
    original_description: null,
    korean_description: `${koreanName}의 대표적인 구성과 특징을 보여주는 샘플입니다.`,
    price,
    currency: "JPY",
    ingredients,
    allergens,
    spicy_level: "none",
    category,
    confidence: 1,
    warning: "명시적 SAMPLE 모드 데이터입니다.",
  };
}
