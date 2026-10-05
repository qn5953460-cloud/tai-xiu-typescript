import { CHIP_VALUES, GAME_AREA_WIDTH, QUICK_EMOJIS, QUICK_TEXTS } from "./constants";

export interface Point {
  x: number;
  y: number;
}

export interface Rect extends Point {
  width: number;
  height: number;
}

export function contains(rect: Rect, point: Point): boolean {
  return point.x >= rect.x && point.x < rect.x + rect.width &&
    point.y >= rect.y && point.y < rect.y + rect.height;
}

export const XIU_RECT: Rect = { x: 70, y: 190, width: 330, height: 150 };
export const TAI_RECT: Rect = { x: 530, y: 190, width: 330, height: 150 };
export const CLEAR_RECT: Rect = { x: 260, y: 675, width: 150, height: 40 };
export const CONFIRM_RECT: Rect = { x: 480, y: 675, width: 150, height: 40 };
export const CHAT_PANEL_RECT: Rect = { x: 950, y: 20, width: 280, height: 710 };

export function lidRect(lidY: number): Rect {
  return { x: GAME_AREA_WIDTH / 2 - 75, y: lidY, width: 150, height: 65 };
}

export const CHIP_RECTS = CHIP_VALUES.map((value, i) => ({
  value,
  rect: {
    x: Math.floor((GAME_AREA_WIDTH - 5 * 90) / 2) + (i % 5) * 90,
    y: 560 + Math.floor(i / 5) * 48,
    width: 80,
    height: 38,
  } satisfies Rect,
}));

export const QUICK_TEXT_RECTS = QUICK_TEXTS.map((message, i) => ({
  message,
  rect: { x: 960 + i * 65, y: 560, width: 60, height: 28 } satisfies Rect,
}));

export const QUICK_EMOJI_RECTS = QUICK_EMOJIS.map((message, i) => ({
  message,
  rect: { x: 960 + i * 52, y: 598, width: 48, height: 28 } satisfies Rect,
}));
