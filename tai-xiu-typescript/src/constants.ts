import type { RGB } from "./types";

export const SCREEN_WIDTH = 1250;
export const SCREEN_HEIGHT = 750;
export const GAME_AREA_WIDTH = 930;
export const BOWL_Y = 90;
export const RESULT_DISPLAY_MS = 4000;

export const COLORS = {
  background: [12, 75, 49],
  gold: [235, 179, 58],
  white: [255, 255, 255],
  black: [20, 20, 20],
  gray: [50, 50, 50],
  lightGray: [200, 200, 200],
  success: [40, 167, 69],
  danger: [220, 53, 69],
  chat: [220, 220, 220],
  system: [255, 215, 0],
} as const satisfies Record<string, RGB>;

export const CHIP_VALUES = [
  1000, 5000, 10000, 50000, 100000,
  500000, 1000000, 5000000, 10000000, 50000000,
] as const;
export const QUICK_TEXTS = ["All in!", "Theo Tai!", "Be Xiu!", "Cau dep!"] as const;
export const QUICK_EMOJIS = ["<3", "LIKE", "HAHA", "MONEY", "GEM"] as const;
