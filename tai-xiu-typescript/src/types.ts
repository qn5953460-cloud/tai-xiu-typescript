export type Side = "TAI" | "XIU";
export type HistoryResult = "T" | "X";
export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;
export type Dice = [DieValue, DieValue, DieValue];
export type RGB = readonly [number, number, number];

export interface ChatMessage {
  sender: string;
  message: string;
  color: RGB;
}

export interface BetRequest {
  side: Side;
  amount: number;
}

export interface SyncGameStatePayload {
  time_left?: number;
  waiting_for_open?: boolean;
  online_count?: number;
  dice?: number[] | null;
}

export interface GameResultPayload {
  dice?: number[];
  result_side?: Side;
  hist_char?: HistoryResult;
}

export interface ChatPayload {
  sender: string;
  message: string;
  color?: number[];
}

// Giữ nguyên tên sự kiện và trường dữ liệu của server Python hiện có.
export interface ServerToClientEvents {
  sync_game_state: (data: SyncGameStatePayload) => void;
  game_result: (data: GameResultPayload) => void;
  new_chat: (data: ChatPayload) => void;
}

export interface ClientToServerEvents {
  place_bet: (data: BetRequest) => void;
  send_chat: (data: { message: string }) => void;
}

export interface GameState {
  connected: boolean;
  playerBalance: number;
  lidY: number;
  isDraggingLid: boolean;
  dragOffsetY: number;
  totalBet: number;
  selectedSide: Side | null;
  hasBetted: boolean;
  timeLeft: number;
  diceResults: Dice;
  gameStatus: string;
  statusColor: RGB;
  isCovered: boolean;
  waitingForOpen: boolean;
  historyResults: HistoryResult[];
  onlineCount: number;
  chatMessages: ChatMessage[];
}
