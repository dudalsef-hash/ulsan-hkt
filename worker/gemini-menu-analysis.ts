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

const ANALYSIS_PROMPT = `이 사진이 실제 음식점 메뉴판인지 먼저 확인하고, 메뉴판이면 보이는 메뉴를 구조화하세요.

- 사진에서 실제로 읽을 수 있는 메뉴만 menus에 포함합니다. 메뉴판에 없는 메뉴를 추가하지 않습니다.
- 메뉴명이 읽히지 않는 항목은 만들지 않습니다.
- 가격과 통화가 불명확하면 반드시 null을 반환합니다.
- original_description은 사진에 설명이 실제로 보이는 경우만 원문으로 반환하고, 없으면 null입니다.
- korean_description은 읽힌 메뉴명과 설명을 근거로 한국인이 이해하기 쉬운 1~2문장으로 작성합니다.
- ingredients와 allergens는 사진 표기 또는 일반적인 음식 지식에 근거할 수 있지만, 일반 지식을 사용했다면 각 메뉴의 warning에 반드시 'AI 추정'임과 매장 확인이 필요함을 적습니다.
- 알레르기 정보는 확정 정보처럼 표현하지 않습니다.
- 매운맛을 판단할 근거가 없으면 spicy_level은 unknown입니다.
- 사진이 메뉴판이 아니거나 너무 흐리거나 글자가 너무 작아 신뢰할 수 있게 읽을 수 없다면 menus를 빈 배열로 반환하고 warnings에 사용자가 다시 촬영할 수 있는 한국어 안내를 넣습니다.
- success는 항상 true로 반환합니다. 서버가 검증 후 최종 성공/실패 응답을 결정합니다.`;

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
