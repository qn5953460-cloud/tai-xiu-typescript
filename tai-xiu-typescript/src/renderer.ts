import { BOWL_Y, COLORS, GAME_AREA_WIDTH, SCREEN_HEIGHT, SCREEN_WIDTH } from "./constants";
import { formatCurrencyShort } from "./game";
import {
  CHAT_PANEL_RECT, CHIP_RECTS, CLEAR_RECT, CONFIRM_RECT, lidRect,
  QUICK_EMOJI_RECTS, QUICK_TEXT_RECTS, TAI_RECT, XIU_RECT,
} from "./layout";
import type { Rect } from "./layout";
import type { DieValue, GameState, RGB } from "./types";

export function cssColor(color: RGB): string {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

const DOTS: Record<DieValue, readonly (readonly [number, number])[]> = {
  1: [[0, 0]],
  2: [[-11, -11], [11, 11]],
  3: [[-11, -11], [0, 0], [11, 11]],
  4: [[-11, -11], [-11, 11], [11, -11], [11, 11]],
  5: [[-11, -11], [-11, 11], [0, 0], [11, -11], [11, 11]],
  6: [[-11, -11], [-11, 0], [-11, 11], [11, -11], [11, 0], [11, 11]],
};

export class GameRenderer {
  private readonly context: CanvasRenderingContext2D;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Trình duyệt không hỗ trợ HTML Canvas 2D.");
    this.context = context;
  }

  resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
    this.canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
  }

  private rectangle(rect: Rect, fill: RGB, radius = 0, border?: RGB, lineWidth = 1): void {
    const ctx = this.context;
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.width, rect.height, radius);
    ctx.fillStyle = cssColor(fill);
    ctx.fill();
    if (border) {
      ctx.strokeStyle = cssColor(border);
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }

  private ellipse(rect: Rect, fill: RGB, border?: RGB, lineWidth = 1): void {
    const ctx = this.context;
    ctx.beginPath();
    ctx.ellipse(rect.x + rect.width / 2, rect.y + rect.height / 2,
      rect.width / 2, rect.height / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = cssColor(fill);
    ctx.fill();
    if (border) {
      ctx.strokeStyle = cssColor(border);
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }

  private circle(x: number, y: number, radius: number, fill: RGB): void {
    const ctx = this.context;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = cssColor(fill);
    ctx.fill();
  }

  private text(
    value: string, x: number, y: number, size: number, color: RGB,
    align: CanvasTextAlign = "left", bold = false,
  ): void {
    const ctx = this.context;
    ctx.font = `${bold ? "bold " : ""}${size}px Arial, sans-serif`;
    ctx.fillStyle = cssColor(color);
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillText(value, x, y);
  }

  private drawDice(x: number, y: number, value: DieValue): void {
    this.rectangle({ x: x - 23, y: y - 23, width: 46, height: 46 },
      COLORS.white, 8, COLORS.black, 2);
    for (const [dx, dy] of DOTS[value]) {
      this.circle(x + dx, y + dy, value === 1 ? 5 : 4,
        value === 1 ? COLORS.danger : COLORS.black);
    }
  }

  render(state: GameState): void {
    const ctx = this.context;
    ctx.setTransform(this.canvas.width / SCREEN_WIDTH, 0, 0,
      this.canvas.height / SCREEN_HEIGHT, 0, 0);
    ctx.fillStyle = cssColor(COLORS.background);
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    ctx.strokeStyle = cssColor([30, 100, 70]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(GAME_AREA_WIDTH, 0);
    ctx.lineTo(GAME_AREA_WIDTH, SCREEN_HEIGHT);
    ctx.stroke();

    this.rectangle({ x: 60, y: 20, width: 150, height: 35 },
      [15, 30, 20], 8, [100, 255, 100]);
    this.text(`ONLINE: ${state.onlineCount}`, 135, 37.5, 15, [100, 255, 100], "center");

    this.rectangle({ x: 60, y: 75, width: 110, height: 75 },
      [20, 30, 25], 12, COLORS.gold, 2);
    this.text("THỜI GIAN", 115, 92, 15, COLORS.lightGray, "center");
    this.text(state.waitingForOpen ? "0" : String(state.timeLeft),
      115, 126, 40, [255, 230, 0], "center");

    this.ellipse({ x: GAME_AREA_WIDTH / 2 - 110, y: BOWL_Y, width: 220, height: 85 },
      COLORS.gray, COLORS.black, 2);
    state.diceResults.forEach((die, index) => {
      this.drawDice(GAME_AREA_WIDTH / 2 - 50 + index * 50, BOWL_Y + 42, die);
    });
    if (state.isCovered) this.ellipse(lidRect(state.lidY), [190, 140, 40], COLORS.gold, 3);

    this.rectangle(XIU_RECT, state.selectedSide === "XIU" ? [180, 50, 60] : [30, 45, 40],
      15, COLORS.white, 3);
    this.text("XỈU", XIU_RECT.x + XIU_RECT.width / 2, XIU_RECT.y + 51,
      56, COLORS.white, "center", true);
    this.text("3 - 10", XIU_RECT.x + XIU_RECT.width / 2, XIU_RECT.y + 106,
      22, COLORS.gold, "center");

    this.rectangle(TAI_RECT, state.selectedSide === "TAI" ? [40, 100, 180] : [30, 45, 40],
      15, COLORS.white, 3);
    this.text("TÀI", TAI_RECT.x + TAI_RECT.width / 2, TAI_RECT.y + 51,
      56, COLORS.white, "center", true);
    this.text("11 - 18", TAI_RECT.x + TAI_RECT.width / 2, TAI_RECT.y + 106,
      22, COLORS.gold, "center");

    this.text(state.gameStatus, GAME_AREA_WIDTH / 2, 369, 22, state.statusColor, "center");
    this.text(`TIỀN CƯỢC: ${formatCurrencyShort(state.totalBet)}đ`,
      GAME_AREA_WIDTH / 2, 411, 30, COLORS.gold, "center");

    this.rectangle({ x: GAME_AREA_WIDTH - 250, y: 20, width: 230, height: 45 },
      [15, 30, 20], 8, COLORS.gold);
    this.text(`Ví: ${formatCurrencyShort(state.playerBalance)}đ`,
      GAME_AREA_WIDTH - 135, 42.5, 22, [100, 255, 100], "center");

    this.text("LỊCH SỬ PHIÊN:", 70, 452, 15, COLORS.lightGray);
    this.rectangle({ x: 60, y: 465, width: 800, height: 50 }, [20, 35, 25], 8);
    state.historyResults.forEach((result, index) => {
      const x = 90 + index * 46;
      this.circle(x, 490, 16, result === "T" ? [40, 100, 180] : [180, 50, 60]);
      this.text(result, x, 490, 14, COLORS.white, "center");
    });

    for (const { rect, value } of CHIP_RECTS) {
      this.rectangle(rect, COLORS.gold, 8);
      this.text(formatCurrencyShort(value), rect.x + rect.width / 2,
        rect.y + rect.height / 2, 15, COLORS.black, "center");
    }

    this.rectangle(CLEAR_RECT, state.hasBetted ? COLORS.gray : COLORS.danger, 8);
    this.text("XÓA CƯỢC", CLEAR_RECT.x + CLEAR_RECT.width / 2,
      CLEAR_RECT.y + CLEAR_RECT.height / 2, 22, COLORS.white, "center");
    this.rectangle(CONFIRM_RECT, state.hasBetted ? COLORS.gray : [0, 123, 255], 8);
    this.text("XÁC NHẬN", CONFIRM_RECT.x + CONFIRM_RECT.width / 2,
      CONFIRM_RECT.y + CONFIRM_RECT.height / 2, 22, COLORS.white, "center");

    this.rectangle(CHAT_PANEL_RECT, [15, 25, 20], 12);
    this.text("CHAT TRỰC TUYẾN", 1090, 45, 22, COLORS.gold, "center");
    // Cắt nội dung trong khung chat để tên/tin nhắn dài không tràn ra ngoài.
    ctx.save();
    ctx.beginPath();
    ctx.rect(965, 60, 255, 480);
    ctx.clip();
    state.chatMessages.slice(-13).forEach(({ sender, message, color }, index) => {
      const y = 80 + index * 33;
      this.text(`${sender}: `, 965, y, 14, COLORS.gold);
      const senderWidth = ctx.measureText(`${sender}: `).width;
      this.text(message, 965 + senderWidth, y, 14, color);
    });
    ctx.restore();

    for (const { rect, message } of QUICK_TEXT_RECTS) {
      this.rectangle(rect, [30, 60, 45], 6);
      this.text(message, rect.x + rect.width / 2, rect.y + rect.height / 2,
        12, COLORS.white, "center");
    }
    for (const { rect, message } of QUICK_EMOJI_RECTS) {
      this.rectangle(rect, [35, 55, 35], 6);
      this.text(message, rect.x + rect.width / 2, rect.y + rect.height / 2,
        12, COLORS.white, "center");
    }
    // Ô nhập chat dùng input HTML nằm trên Canvas để hỗ trợ tiếng Việt/IME.
  }
}
