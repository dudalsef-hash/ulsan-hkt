import {
  GEMINI_MENU_MODEL,
  isMenuAnalysisResult,
  MENU_ANALYSIS_SCHEMA,
  type MenuAnalysisError,
  type MenuAnalysisResult,
} from "../lib/gemini-menu-analysis";

const GEMINI_INTERACTIONS_URL =
  "https://generativelanguage.googleapis.com/v1beta/interactions";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export interface GeminiMenuEnv {
  GEMINI_API_KEY?: string;
}

interface GeminiInteractionTextContent {
  type?: string;
  text?: string;
}

interface GeminiInteractionStep {
  type?: string;
  content?: GeminiInteractionTextContent[];
}

interface GeminiInteractionPayload {
  steps?: GeminiInteractionStep[];
}

const ANALYSIS_PROMPT = `You are a multilingual restaurant menu analysis AI. Analyze the uploaded menu photo following these rules:

1. LANGUAGE DETECTION
- Automatically detect the language(s) of the menu. Return detected language codes in detected_language field.
- If multiple languages are present (e.g., Japanese + English), detect ALL languages.
- Support ALL languages including but not limited to: ko, en, ja, zh-CN, zh-TW, es, fr, de, it, pt, ru, th, vi, id, ms, tl, hi, ar, tr, nl, pl, uk, sv, da, no, fi, cs, el, he, ro.

2. MENU EXTRACTION
- Only include menus that are actually readable in the photo. Do NOT invent menus.
- Preserve the original menu name EXACTLY as written (original_name).
- If the original text is in Japanese, keep it in Japanese. If English, keep English. Never translate the original.
- Provide korean_name as a natural Korean translation of the menu name.
- Provide korean_description as a 1-2 sentence Korean explanation of the dish.

3. PRICE & CURRENCY
- Extract price and currency from the menu. Return null if unclear.
- Detect currency automatically (JPY, KRW, USD, EUR, GBP, CNY, THB, VND, etc.)
- Do NOT assume any default currency. Only return what you can actually read.

4. INGREDIENTS & ALLERGENS
- Infer main ingredients from the menu name, description, or general food knowledge.
- If using general knowledge (not explicitly written), add a warning noting "AI 추정" and that staff confirmation is needed.
- Never present allergy information as confirmed fact.
- Detect allergens in ANY language (e.g., peanut, ピーナッツ, 花生, cacahuète, etc.)

5. SPICY LEVEL & DIETARY
- If there is no evidence of spiciness, set spicy_level to "unknown".
- Consider vegetarian/vegan information if available.

6. VALIDATION
- If the photo is NOT a menu, is too blurry, or text is unreadable, return empty menus array and add a Korean warning.
- success is always true. The server decides final success/failure.

7. original_description: only include if actually visible in the photo (in original language), otherwise null.`;

export async function handleAnalyzeMenuRequest(
  request: Request,
  env: GeminiMenuEnv,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== "POST") {
    return errorResponse(405, "POST 요청만 지원합니다.");
  }

  if (!env.GEMINI_API_KEY) {
    return errorResponse(
      503,
      "Gemini API Key가 설정되지 않았습니다. 관리자에게 문의해주세요.",
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse(400, "이미지 요청을 읽을 수 없습니다. 다시 선택해주세요.");
  }

  const image = formData.get("image");
  if (!(image instanceof Blob)) {
    return errorResponse(400, "분석할 메뉴판 사진을 선택해주세요.");
  }
  if (!SUPPORTED_IMAGE_TYPES.has(image.type)) {
    return errorResponse(415, "JPEG, PNG, WebP 또는 GIF 이미지를 선택해주세요.");
  }
  if (image.size === 0) {
    return errorResponse(400, "선택한 이미지가 비어 있습니다.");
  }
  if (image.size > MAX_IMAGE_BYTES) {
    return errorResponse(413, "이미지 크기는 10MB 이하여야 합니다.");
  }

  const imageBase64 = bytesToBase64(new Uint8Array(await image.arrayBuffer()));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const geminiResponse = await fetcher(GEMINI_INTERACTIONS_URL, {
      method: "POST",
      headers: {
        "x-goog-api-key": env.GEMINI_API_KEY,
        "Content-Type": "application/json",
        "Api-Revision": "2026-05-20",
      },
      body: JSON.stringify({
        model: GEMINI_MENU_MODEL,
        input: [
          { type: "text", text: ANALYSIS_PROMPT },
          { type: "image", data: imageBase64, mime_type: image.type },
        ],
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: MENU_ANALYSIS_SCHEMA,
        },
      }),
      signal: controller.signal,
    });

    if (!geminiResponse.ok) {
      if (geminiResponse.status === 400) {
        return errorResponse(
          502,
          "Gemini가 이미지를 처리하지 못했습니다. 다른 사진으로 다시 시도해주세요.",
        );
      }
      if (geminiResponse.status === 401 || geminiResponse.status === 403) {
        return errorResponse(
          502,
          "Gemini API 인증에 실패했습니다. 관리자에게 API Key 설정을 확인해주세요.",
        );
      }
      if (geminiResponse.status === 429) {
        return errorResponse(
          503,
          "Gemini 무료 사용량 또는 요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요.",
        );
      }
      return errorResponse(
        502,
        "Gemini 메뉴 분석에 실패했습니다. 잠시 후 다시 시도해주세요.",
      );
    }

    const payload = (await geminiResponse.json()) as GeminiInteractionPayload;
    const outputText = extractGeminiOutputText(payload);
    if (!outputText) {
      return errorResponse(502, "Gemini 분석 결과가 비어 있습니다. 다시 시도해주세요.");
    }

    let analysis: MenuAnalysisResult;
    try {
      const parsed: unknown = JSON.parse(outputText);
      if (!isMenuAnalysisResult(parsed)) throw new Error("Invalid schema");
      analysis = parsed;
    } catch {
      return errorResponse(
        502,
        "Gemini 분석 결과 형식을 확인할 수 없습니다. 다시 시도해주세요.",
      );
    }

    if (analysis.menus.length === 0) {
      return errorResponse(
        422,
        analysis.warnings[0] ??
          "메뉴판 글자가 잘 보이지 않습니다. 메뉴판 전체가 선명하게 보이도록 다시 촬영해주세요.",
      );
    }

    return jsonResponse(analysis, 200);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return errorResponse(504, "분석 시간이 너무 오래 걸렸습니다. 다시 시도해주세요.");
    }
    return errorResponse(
      502,
      "Gemini 서버와 통신하지 못했습니다. 네트워크를 확인하고 다시 시도해주세요.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

function extractGeminiOutputText(
  payload: GeminiInteractionPayload,
): string | null {
  if (!Array.isArray(payload.steps)) return null;

  for (let index = payload.steps.length - 1; index >= 0; index -= 1) {
    const step = payload.steps[index];
    if (step?.type !== "model_output" || !Array.isArray(step.content)) continue;

    const outputText = step.content
      .filter(
        (content) =>
          content?.type === "text" && typeof content.text === "string",
      )
      .map((content) => content.text)
      .join("")
      .trim();

    if (outputText) return outputText;
  }

  return null;
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 24_576;
  let base64 = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    let binary = "";
    for (const byte of chunk) binary += String.fromCharCode(byte);
    base64 += btoa(binary);
  }
  return base64;
}

function errorResponse(status: number, error: string): Response {
  const body: MenuAnalysisError = { success: false, error };
  return jsonResponse(body, status);
}

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
