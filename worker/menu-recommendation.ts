import { GEMINI_MENU_MODEL } from "../lib/gemini-menu-analysis";
import {
  getEligibleMenus,
  getMinimumAdditionalBudget,
  isGeminiRecommendationSelection,
  isMenuRecommendationRequest,
  MENU_RECOMMENDATION_SCHEMA,
  validateRecommendation,
  type EligibleMenu,
  type MenuRecommendationError,
  type MenuRecommendationRequest,
} from "../lib/menu-recommendation";

const GEMINI_INTERACTIONS_URL =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

export interface MenuRecommendationEnv {
  GEMINI_API_KEY?: string;
}

interface GeminiInteractionPayload {
  steps?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
}

export async function handleRecommendMenuRequest(
  request: Request,
  env: MenuRecommendationEnv,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== "POST") {
    return errorResponse(405, "POST 요청만 지원합니다.", "INVALID_REQUEST");
  }

  if (!env.GEMINI_API_KEY) {
    return errorResponse(
      503,
      "Gemini API Key가 설정되지 않았습니다. 관리자에게 문의해주세요.",
      "MISSING_API_KEY",
    );
  }

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return errorResponse(400, "추천 요청을 읽을 수 없습니다.", "INVALID_REQUEST");
  }

  if (!isMenuRecommendationRequest(requestBody)) {
    return errorResponse(
      400,
      "인원수, 총예산 또는 메뉴 정보가 올바르지 않습니다.",
      "INVALID_REQUEST",
    );
  }

  const { eligible, currency } = getEligibleMenus(
    requestBody.menus,
    requestBody.conditions,
  );
  if (eligible.length === 0) {
    return errorResponse(
      422,
      "현재 예산과 알레르기 조건을 모두 만족하는 메뉴 조합을 찾기 어려워요.",
      "NO_ELIGIBLE_MENUS",
    );
  }

  const minimumAdditionalBudget = getMinimumAdditionalBudget(
    eligible,
    requestBody.conditions.people,
    requestBody.conditions.budget,
  );
  if (minimumAdditionalBudget !== undefined) {
    return jsonResponse(
      {
        success: false,
        code: "BUDGET_TOO_LOW",
        error: "현재 예산과 알레르기 조건을 모두 만족하는 메뉴 조합을 찾기 어려워요.",
        minimum_additional_budget: minimumAdditionalBudget,
      } satisfies MenuRecommendationError,
      422,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

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
          {
            type: "text",
            text: buildRecommendationPrompt(requestBody, eligible, currency),
          },
        ],
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: MENU_RECOMMENDATION_SCHEMA,
        },
      }),
      signal: controller.signal,
    });

    if (!geminiResponse.ok) {
      if (geminiResponse.status === 401 || geminiResponse.status === 403) {
        return errorResponse(
          502,
          "Gemini API 인증에 실패했습니다. 관리자에게 API Key 설정을 확인해주세요.",
          "AI_ERROR",
        );
      }
      if (geminiResponse.status === 429) {
        return errorResponse(
          503,
          "Gemini 요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요.",
          "AI_ERROR",
        );
      }
      return errorResponse(
        502,
        "AI 메뉴 조합 추천에 실패했습니다. 잠시 후 다시 시도해주세요.",
        "AI_ERROR",
      );
    }

    const payload = (await geminiResponse.json()) as GeminiInteractionPayload;
    const outputText = extractGeminiOutputText(payload);
    if (!outputText) {
      return errorResponse(
        502,
        "Gemini 추천 결과가 비어 있습니다. 다시 시도해주세요.",
        "AI_ERROR",
      );
    }

    let selection: unknown;
    try {
      selection = JSON.parse(outputText);
    } catch {
      return errorResponse(
        502,
        "Gemini 추천 결과 형식을 확인할 수 없습니다. 다시 시도해주세요.",
        "AI_ERROR",
      );
    }
    if (!isGeminiRecommendationSelection(selection)) {
      return errorResponse(
        502,
        "Gemini 추천 결과 형식이 올바르지 않습니다. 다시 시도해주세요.",
        "AI_ERROR",
      );
    }

    const validated = validateRecommendation(
      selection,
      eligible,
      requestBody.conditions,
      requestBody.previous_combination,
    );
    return jsonResponse(validated, validated.success ? 200 : 422);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return errorResponse(
        504,
        "추천 시간이 너무 오래 걸렸습니다. 다시 시도해주세요.",
        "AI_ERROR",
      );
    }
    return errorResponse(
      502,
      "Gemini 서버와 통신하지 못했습니다. 네트워크를 확인해주세요.",
      "AI_ERROR",
    );
  } finally {
    clearTimeout(timeout);
  }
}

function buildRecommendationPrompt(
  request: MenuRecommendationRequest,
  eligible: EligibleMenu[],
  currency: string,
): string {
  const conditions = request.conditions;
  const candidates = eligible.map(({ menu_id: menuId, menu, price }) => ({
    menu_id: menuId,
    original_name: menu.original_name,
    korean_name: menu.korean_name,
    price,
    currency,
    description: menu.korean_description,
    ingredients: menu.ingredients,
    allergens: menu.allergens,
    spicy_level: menu.spicy_level,
    category: menu.category,
    warning: menu.warning,
  }));

  return `당신은 음식점 메뉴 주문 조합을 고르는 도우미입니다. 아래 후보에 실제로 있는 menu_id만 사용하세요.

우선순위는 1) 알레르기·식이 제한 2) 총예산 3) 인원수 4) 식사 구성 5) 다양성입니다.
- 후보 목록은 서버가 가격·통화·알레르기·매운맛 조건으로 1차 제외한 안전 후보입니다.
- 정확히 ${conditions.people}명이 자연스럽게 식사할 수 있도록 총 수량을 최소 ${conditions.people}개로 구성하세요.
- 메인 메뉴를 인원수에 맞게 우선하고, 실제 side 후보가 있으며 예산이 허용될 때만 공유 사이드를 더하세요.
- 총액은 모든 price × quantity의 합이며 ${currency} ${conditions.budget}을 절대 넘지 마세요.
- 가능하면 noodle, rice, meat, seafood 등 서로 다른 분류를 섞되 상위 조건을 위반하지 마세요.
- 후보에 없는 메뉴를 새로 만들거나 메뉴명을 menu_id 대신 반환하지 마세요.
- 가격이 없는 메뉴는 후보에서 이미 제외되었습니다.
${
    request.previous_combination?.length
      ? `- 이전 조합 ${JSON.stringify(request.previous_combination)}과 다른 적절한 조합을 우선하세요. 대안이 없으면 같은 조합을 반환해도 됩니다.`
      : ""
}

사용자 조건:
${JSON.stringify(conditions)}

선택 가능한 실제 메뉴:
${JSON.stringify(candidates)}`;
}

function extractGeminiOutputText(
  payload: GeminiInteractionPayload,
): string | null {
  if (!Array.isArray(payload.steps)) return null;

  for (let index = payload.steps.length - 1; index >= 0; index -= 1) {
    const step = payload.steps[index];
    if (step?.type !== "model_output" || !Array.isArray(step.content)) continue;
    const output = step.content
      .filter((content) => content?.type === "text" && typeof content.text === "string")
      .map((content) => content.text)
      .join("")
      .trim();
    if (output) return output;
  }

  return null;
}

function errorResponse(
  status: number,
  error: string,
  code: NonNullable<MenuRecommendationError["code"]>,
): Response {
  return jsonResponse({ success: false, error, code } satisfies MenuRecommendationError, status);
}

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
