"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";
import type {
  AnalyzedMenuItem,
  MenuAnalysisError,
  MenuAnalysisResult,
  SpicyLevel,
} from "../lib/gemini-menu-analysis";

type Screen = "setup" | "analyzing" | "results";

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

export default function Home() {
  const [screen, setScreen] = useState<Screen>("setup");
  const [people, setPeople] = useState(3);
  const [budget, setBudget] = useState(4000);
  const [peanutAllergy, setPeanutAllergy] = useState(true);
  const [avoidSpicy, setAvoidSpicy] = useState(true);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<MenuAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
    setScreen("setup");
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <section className="phone-frame" aria-live="polite">
        <AppHeader
          screen={screen}
          onBack={screen === "setup" ? undefined : resetAnalysis}
        />

        {screen === "setup" && (
          <SetupScreen
            people={people}
            budget={budget}
            peanutAllergy={peanutAllergy}
            avoidSpicy={avoidSpicy}
            errorMessage={errorMessage}
            onPeopleChange={setPeople}
            onBudgetChange={setBudget}
            onPeanutChange={setPeanutAllergy}
            onSpicyChange={setAvoidSpicy}
            onImage={handleImage}
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
            peanutAllergy={peanutAllergy}
            avoidSpicy={avoidSpicy}
            previewUrl={previewUrl}
            onRestart={resetAnalysis}
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
      <span className="demo-pill">GEMINI AI</span>
      <span className="screen-index" aria-label="진행 단계">
        {screen === "setup" ? "1/3" : screen === "analyzing" ? "2/3" : "3/3"}
      </span>
    </header>
  );
}

function SetupScreen({
  people,
  budget,
  peanutAllergy,
  avoidSpicy,
  errorMessage,
  onPeopleChange,
  onBudgetChange,
  onPeanutChange,
  onSpicyChange,
  onImage,
}: {
  people: number;
  budget: number;
  peanutAllergy: boolean;
  avoidSpicy: boolean;
  errorMessage: string | null;
  onPeopleChange: (value: number) => void;
  onBudgetChange: (value: number) => void;
  onPeanutChange: (value: boolean) => void;
  onSpicyChange: (value: boolean) => void;
  onImage: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
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

        <div className="toggle-grid">
          <button className={peanutAllergy ? "option-toggle active danger" : "option-toggle"} onClick={() => onPeanutChange(!peanutAllergy)} aria-pressed={peanutAllergy}>
            <span>🥜</span><div><strong>땅콩 알레르기</strong><small>{peanutAllergy ? "확인 필요" : "적용 안 함"}</small></div><i>{peanutAllergy ? "✓" : "+"}</i>
          </button>
          <button className={avoidSpicy ? "option-toggle active" : "option-toggle"} onClick={() => onSpicyChange(!avoidSpicy)} aria-pressed={avoidSpicy}>
            <span>🌶️</span><div><strong>맵지 않게</strong><small>{avoidSpicy ? "확인 필요" : "적용 안 함"}</small></div><i>{avoidSpicy ? "✓" : "+"}</i>
          </button>
        </div>
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
  peanutAllergy,
  avoidSpicy,
  previewUrl,
  onRestart,
}: {
  analysis: MenuAnalysisResult;
  people: number;
  budget: number;
  peanutAllergy: boolean;
  avoidSpicy: boolean;
  previewUrl: string | null;
  onRestart: () => void;
}) {
  const peanutMatches = analysis.menus.filter((menu) =>
    menu.allergens.some((item) => /땅콩|낙화생|peanut/i.test(item)),
  ).length;

  return (
    <div className="screen-content enter-animation results-screen">
      <section className="result-summary">
        <div className="result-icon">✓</div>
        <div><p>분석 완료</p><h2>{analysis.menus.length}개 메뉴를 찾았어요</h2><span>{people}명 · 예산 ¥{budget.toLocaleString()} · {analysis.detected_language ?? "언어 자동 감지"}</span></div>
        {previewUrl && (
          // 선택한 로컬 Blob URL은 Next 이미지 최적화 대상이 아닙니다.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="분석한 메뉴판" />
        )}
      </section>

      {peanutAllergy && (
        <div className="alert-card"><span>🥜</span><div><strong>{peanutMatches > 0 ? `땅콩 가능성 ${peanutMatches}개 발견` : "땅콩 관련 정보를 찾지 못했어요"}</strong><p>{peanutMatches > 0 ? "AI 추정 결과이므로 해당 메뉴의 warning과 매장 확인이 필요합니다." : "표기가 없다고 안전하다는 뜻은 아닙니다. 반드시 직원에게 확인하세요."}</p></div></div>
      )}

      {analysis.warnings.map((warning, index) => (
        <div className="analysis-warning" role="note" key={`${warning}-${index}`}>⚠️ {warning}</div>
      ))}

      <div className="section-heading menu-heading"><div><p>RECOGNIZED MENU</p><h3>인식한 메뉴</h3></div><span>{avoidSpicy ? "매운맛 확인" : "전체 결과"}</span></div>
      <div className="menu-list detailed-menu-list">
        {analysis.menus.map((item, index) => (
          <MenuCard item={item} index={index} key={`${item.original_name}-${index}`} />
        ))}
      </div>

      <button className="primary-button" onClick={onRestart}>다른 메뉴판 분석하기 <span>→</span></button>
      <p className="safety-note">⚠️ AI가 추정한 정보이며 실제 재료·알레르기·조리 과정은 매장에 확인하세요.</p>
    </div>
  );
}

function MenuCard({ item, index }: { item: AnalyzedMenuItem; index: number }) {
  const risk = item.allergens.length > 0 ? "danger" : item.warning ? "caution" : "safe";

  return (
    <article className="menu-item detailed-menu-item">
      <div className="menu-title-row">
        <div className={`risk-dot ${risk}`} />
        <div className="menu-copy">
          <small>{item.original_name || `메뉴 ${index + 1}`}</small>
          <strong>{item.korean_name || item.original_name}</strong>
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
      <div className="confidence-row"><span>인식 신뢰도 {Math.round(item.confidence * 100)}%</span><i><b style={{ width: `${Math.round(item.confidence * 100)}%` }} /></i></div>
      {item.warning && <p className="item-warning">⚠️ {item.warning}</p>}
    </article>
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
