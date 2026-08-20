import type { MockMenuItem } from "../mock-data";

export interface RecommendationRequest {
  people: number;
  budget: number;
  allergies: string[];
}

export interface RecommendationResponse {
  items: MockMenuItem[];
  totalPrice: number;
  perPersonPrice: number;
  reasoning?: string;
}
