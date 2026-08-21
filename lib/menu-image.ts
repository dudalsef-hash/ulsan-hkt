import { findLocalMenuImage } from "./menu-image-mapping";

export interface MenuImage {
  url: string;
  alt: string;
  source_url: string | null;
  attribution: string;
  license: string | null;
}

interface MenuImageSuccess {
  success: true;
  image: MenuImage | null;
}

interface MenuImageFailure {
  success: false;
  error: string;
}

const menuImageCache = new Map<string, MenuImage | null>();
const pendingMenuImageRequests = new Map<string, Promise<MenuImage | null>>();

export function getMenuImage(
  originalName: string,
  koreanName: string,
): Promise<MenuImage | null> {
  const cacheKey = createCacheKey(originalName, koreanName);
  if (menuImageCache.has(cacheKey)) {
    return Promise.resolve(menuImageCache.get(cacheKey) ?? null);
  }

  const localImage = findLocalMenuImage(originalName, koreanName);
  if (localImage) {
    menuImageCache.set(cacheKey, localImage);
    return Promise.resolve(localImage);
  }

  const pendingRequest = pendingMenuImageRequests.get(cacheKey);
  if (pendingRequest) return pendingRequest;

  const request = fetch(
    `/api/menu-image?${new URLSearchParams({
      original_name: originalName,
      korean_name: koreanName,
    })}`,
  )
    .then(async (response) => {
      const payload = (await response.json().catch(() => null)) as
        | MenuImageSuccess
        | MenuImageFailure
        | null;

      if (!response.ok || !payload || payload.success === false) {
        throw new Error(
          payload?.success === false
            ? payload.error
            : "대표 이미지를 불러오지 못했습니다.",
        );
      }

      menuImageCache.set(cacheKey, payload.image);
      return payload.image;
    })
    .finally(() => {
      pendingMenuImageRequests.delete(cacheKey);
    });

  pendingMenuImageRequests.set(cacheKey, request);
  return request;
}

function createCacheKey(originalName: string, koreanName: string): string {
  return `${originalName.trim().toLocaleLowerCase()}|${koreanName
    .trim()
    .toLocaleLowerCase()}`;
}
