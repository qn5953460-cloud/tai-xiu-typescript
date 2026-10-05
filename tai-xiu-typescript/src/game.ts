import { BOWL_Y, CHIP_VALUES, COLORS } from "./constants";
import type {
  BetRequest, ChatPayload, Dice, GameResultPayload, GameState, RGB,
  Side, SyncGameStatePayload,
} from "./types";

export function formatCurrencyShort(amount: number): string {
  if (amount === 0) return "0";
  if (amount >= 1_000_000) {
    const value = amount / 1_000_000;
    return `${Number.isInteger(value) ? value : value.toFixed(1)}M`;
  }
  if (amount >= 1000) {
    const value = amount / 1000;
    return `${Number.isInteger(value) ? value : value.toFixed(1)}k`;
  }
  return String(amount);
}

function normalizeDice(value: unknown): Dice {
  if (Array.isArray(value) && value.length === 3 &&
      value.every((die: unknown) => typeof die === "number" &&
        Number.isInteger(die) && die >= 1 && die <= 6)) {
    return [...value] as Dice;
  }
  return [1, 1, 1];
}

function normalizeColor(value: unknown): RGB {
  if (!Array.isArray(value) || value.length !== 3 ||
      !value.every((component: unknown) => typeof component === "number" &&
        Number.isFinite(component))) return COLORS.chat;
  return value.map((component: number) => Math.max(0, Math.min(255, component))) as
    [number, number, number];
}

export class GameModel {
  readonly state: GameState = {
    connected: false,
    playerBalance: 50_000_000,
    lidY: BOWL_Y + 10,
    isDraggingLid: false,
    dragOffsetY: 0,
    totalBet: 0,
    selectedSide: null,
    hasBetted: false,
    timeLeft: 15,
    diceResults: [1, 1, 1],
    gameStatus: "ĐANG KẾT NỐI SERVER...",
    statusColor: COLORS.white,
    isCovered: true,
    waitingForOpen: false,
    historyResults: [],
    onlineCount: 1,
    chatMessages: [{
      sender: "Hệ thống",
      message: "Đang kết nối tới máy chủ...",
      color: COLORS.system,
    }],
  };

  addChat(sender: string, message: string, color: RGB = COLORS.chat): void {
    this.state.chatMessages.push({ sender, message, color });
    if (this.state.chatMessages.length > 14) this.state.chatMessages.shift();
  }

  onConnect(): void {
    this.state.connected = true;
    this.state.gameStatus = "ĐANG ĐẶT CƯỢC...";
    this.state.statusColor = COLORS.white;
    this.addChat("Hệ thống", "Kết nối thành công tới phòng Tài Xỉu Online!", COLORS.system);
  }

  onDisconnect(): void {
    this.state.connected = false;
    this.state.gameStatus = "MẤT KẾT NỐI VỚI SERVER!";
    this.state.statusColor = COLORS.danger;
    this.addChat("Hệ thống", "Mất kết nối với máy chủ!", [255, 100, 100]);
  }

  onConnectionError(): void {
    this.state.connected = false;
    this.state.gameStatus = "KHÔNG THỂ KẾT NỐI SERVER!";
    this.state.statusColor = COLORS.danger;
  }

  syncState(data: SyncGameStatePayload): void {
    this.state.timeLeft = data.time_left ?? 15;
    this.state.waitingForOpen = data.waiting_for_open ?? false;
    this.state.onlineCount = data.online_count ?? 1;
    if (data.dice?.length) this.state.diceResults = normalizeDice(data.dice);
  }

  receiveChat(data: ChatPayload): void {
    this.addChat(data.sender, data.message, normalizeColor(data.color));
  }

  canEditBet(): boolean {
    return this.state.timeLeft > 0 && !this.state.waitingForOpen && !this.state.hasBetted;
  }

  selectSide(side: Side): void {
    if (this.canEditBet()) this.state.selectedSide = side;
  }

  addChip(value: number): void {
    if (this.canEditBet() && CHIP_VALUES.some((chip) => chip === value) &&
        this.state.totalBet + value <= this.state.playerBalance) {
      this.state.totalBet += value;
    }
  }

  clearBet(): void {
    if (!this.canEditBet()) return;
    this.state.totalBet = 0;
    this.state.selectedSide = null;
  }

  confirmBet(): BetRequest | null {
    const state = this.state;
    if (!state.connected || !this.canEditBet() || !state.selectedSide || state.totalBet <= 0) {
      return null;
    }
    state.hasBetted = true;
    state.gameStatus = "ĐÃ GỬI CƯỢC LÊN SERVER!";
    return { side: state.selectedSide, amount: state.totalBet };
  }

  applyResult(data: GameResultPayload): void {
    const state = this.state;
    state.diceResults = normalizeDice(data.dice);
    const totalScore = state.diceResults.reduce((sum, die) => sum + die, 0);
    const resultSide = data.result_side ?? "TAI";
    state.historyResults.push(data.hist_char ?? "T");
    if (state.historyResults.length > 16) state.historyResults.shift();
    state.waitingForOpen = true;
    state.isCovered = true;

    // Giữ điều kiện quyết toán của bản Python: dựa vào cửa đã chọn và tổng cược.
    if (state.selectedSide === null || state.totalBet === 0) {
      state.gameStatus = `KẾT QUẢ: ${totalScore} ĐIỂM (${resultSide})`;
      state.statusColor = COLORS.white;
    } else if (state.selectedSide === resultSide) {
      const houseFee = Math.trunc(state.totalBet * 0.10);
      const netWin = state.totalBet - houseFee;
      state.playerBalance += netWin;
      state.gameStatus = `THẮNG +${formatCurrencyShort(netWin)}đ!`;
      state.statusColor = COLORS.success;
    } else {
      state.playerBalance -= state.totalBet;
      state.gameStatus = `THUA -${formatCurrencyShort(state.totalBet)}đ! (${totalScore} ĐIỂM)`;
      state.statusColor = COLORS.danger;
    }
  }

  resetRound(): void {
    const state = this.state;
    state.totalBet = 0;
    state.selectedSide = null;
    state.hasBetted = false;
    state.isCovered = true;
    state.waitingForOpen = false;
    state.lidY = BOWL_Y + 10;
    state.isDraggingLid = false;
    state.gameStatus = state.connected ? "ĐANG ĐẶT CƯỢC..." : "MẤT KẾT NỐI VỚI SERVER!";
    state.statusColor = state.connected ? COLORS.white : COLORS.danger;
  }

  startLidDrag(pointerY: number): void {
    if (!this.state.isCovered) return;
    this.state.isDraggingLid = true;
    this.state.dragOffsetY = pointerY - this.state.lidY;
  }

  moveLid(pointerY: number): void {
    if (!this.state.isDraggingLid) return;
    const nextY = pointerY - this.state.dragOffsetY;
    if (nextY < BOWL_Y - 80) this.state.isCovered = false;
    this.state.lidY = Math.max(BOWL_Y - 80, Math.min(BOWL_Y + 120, nextY));
  }

  stopLidDrag(): void {
    this.state.isDraggingLid = false;
  }
}
