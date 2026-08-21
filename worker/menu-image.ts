import { findLocalMenuImage } from "../lib/menu-image-mapping";

const WIKIMEDIA_API_URL =
  "https://api.wikimedia.org/core/v1/commons/search/page";
const MAX_MENU_NAME_LENGTH = 120;

interface WikimediaPage {
  key?: string;
  thumbnail?: {
    mimetype?: string;
    url?: string;
  } | null;
  title?: string;
}

interface WikimediaResponse {
  pages?: WikimediaPage[];
}

interface MenuImage {
  url: string;
  alt: string;
  source_url: string | null;
  attribution: string;
  license: string | null;
}

export async function handleMenuImageRequest(
  request: Request,
): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse(
      { success: false, error: "지원하지 않는 요청 방식입니다." },
      405,
      { Allow: "GET" },
    );
  }

  const requestUrl = new URL(request.url);
  const originalName = normalizeMenuName(
    requestUrl.searchParams.get("original_name"),
  );
  const koreanName = normalizeMenuName(
    requestUrl.searchParams.get("korean_name"),
  );
  const searchNames = [...new Set([originalName, koreanName].filter(Boolean))];

  if (searchNames.length === 0) {
    return jsonResponse(
      { success: false, error: "사진을 찾을 메뉴명이 필요합니다." },
      400,
    );
  }

  const localImage = findLocalMenuImage(originalName, koreanName);
  if (localImage) {
    return jsonResponse(
      { success: true, image: localImage },
      200,
      { "Cache-Control": "public, max-age=86400" },
    );
  }

  try {
    for (const searchName of searchNames) {
      const image = await searchWikimediaImage(searchName);
      if (image) {
        return jsonResponse(
          { success: true, image },
          200,
          {
            "Cache-Control":
              "public, max-age=86400, stale-while-revalidate=604800",
          },
        );
      }
    }

    return jsonResponse(
      { success: true, image: null },
      200,
      {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    );
  } catch (error) {
    console.error(
      "Menu image lookup failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return jsonResponse(
      { success: false, error: "대표 이미지를 불러오지 못했습니다." },
      502,
    );
  }
}

async function searchWikimediaImage(
  menuName: string,
): Promise<MenuImage | null> {
  const apiUrl = new URL(WIKIMEDIA_API_URL);
  apiUrl.search = new URLSearchParams({
    q: menuName,
    limit: "10",
  }).toString();

  const upstream = await fetch(apiUrl.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "MenuMate/1.0 (https://github.com/dudalsef-hash/ulsan-hkt)",
    },
  });

  if (!upstream.ok) {
    throw new Error(`Wikimedia request failed: ${upstream.status}`);
  }

  const payload = (await upstream.json()) as WikimediaResponse;
  return pickRepresentativeImage(payload, menuName);
}

function pickRepresentativeImage(
  payload: WikimediaResponse,
  menuName: string,
): MenuImage | null {
  const pages = payload.pages ?? [];

  for (const page of pages) {
    const title = page.title ?? page.key ?? "";
    const thumbnail = page.thumbnail;
    if (
      !thumbnail?.url ||
      !thumbnail.mimetype?.startsWith("image/") ||
      !/\.(?:jpe?g|png|webp|gif|tiff?)$/i.test(title)
    ) {
      continue;
    }

    return {
      url: resizeWikimediaThumbnail(thumbnail.url, 960),
      alt: `${menuName} 대표 이미지`,
      source_url: page.key
        ? `https://commons.wikimedia.org/wiki/${encodeURIComponent(
            page.key.replace(/ /g, "_"),
          )}`
        : null,
      attribution: "Wikimedia Commons",
      license: null,
    };
  }

  return null;
}

function resizeWikimediaThumbnail(url: string, width: number): string {
  return url.replace(/\/\d+px-([^/?]+)(\?.*)?$/, `/${width}px-$1$2`);
}

function normalizeMenuName(value: string | null): string {
  return Array.from(value ?? "")
    .map((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint < 32 || codePoint === 127 ? " " : character;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_MENU_NAME_LENGTH);
}

function jsonResponse(
  body: unknown,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return Response.json(body, {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
