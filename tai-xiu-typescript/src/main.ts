import "./style.css";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "./constants";
import { GameModel } from "./game";
import {
  CHIP_RECTS, CLEAR_RECT, CONFIRM_RECT, contains, lidRect,
  QUICK_EMOJI_RECTS, QUICK_TEXT_RECTS, TAI_RECT, XIU_RECT,
} from "./layout";
import type { Point } from "./layout";
import { GameRenderer } from "./renderer";
import { bindSocketEvents, createGameSocket } from "./socket";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
const chatInput = document.querySelector<HTMLInputElement>("#chat-input");
if (!canvas || !chatInput) throw new Error("Thiếu Canvas hoặc ô nhập chat trong index.html.");

const game = new GameModel();
const renderer = new GameRenderer(canvas);
const socket = createGameSocket(
  import.meta.env.VITE_SOCKET_URL || "https://tai-xiu-server.onrender.com",
);
const unbindSocketEvents = bindSocketEvents(socket, game);
const events = new AbortController();
const options = { signal: events.signal };
let draggingPointerId: number | null = null;

// Đổi tọa độ màn hình về tọa độ gốc 1250 x 750 khi cửa sổ co giãn.
function gamePoint(event: PointerEvent): Point {
  const bounds = canvas!.getBoundingClientRect();
  return {
    x: (event.clientX - bounds.left) * SCREEN_WIDTH / bounds.width,
    y: (event.clientY - bounds.top) * SCREEN_HEIGHT / bounds.height,
  };
}

function sendChat(message: string): boolean {
  const cleanMessage = message.trim();
  if (!cleanMessage || !socket.connected) return false;
  socket.emit("send_chat", { message: cleanMessage });
  return true;
}

canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || !event.isPrimary) return;
  const point = gamePoint(event);
  chatInput.blur();
  if (game.state.isCovered && contains(lidRect(game.state.lidY), point)) {
    game.startLidDrag(point.y);
    draggingPointerId = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  for (const { rect, message } of [...QUICK_TEXT_RECTS, ...QUICK_EMOJI_RECTS]) {
    if (contains(rect, point)) sendChat(message);
  }

  if (!game.canEditBet()) return;
  if (contains(XIU_RECT, point)) game.selectSide("XIU");
  else if (contains(TAI_RECT, point)) game.selectSide("TAI");

  for (const { rect, value } of CHIP_RECTS) {
    if (contains(rect, point)) game.addChip(value);
  }
  if (contains(CLEAR_RECT, point)) game.clearBet();
  if (contains(CONFIRM_RECT, point) && socket.connected) {
    const bet = game.confirmBet();
    if (bet) socket.emit("place_bet", bet);
  }
}, options);

canvas.addEventListener("pointermove", (event) => {
  const point = gamePoint(event);
  if (draggingPointerId === event.pointerId) game.moveLid(point.y);
  const overLid = game.state.isCovered && contains(lidRect(game.state.lidY), point);
  const overChatButton = [...QUICK_TEXT_RECTS, ...QUICK_EMOJI_RECTS]
    .some(({ rect }) => contains(rect, point));
  const overBetButton = game.canEditBet() &&
    [XIU_RECT, TAI_RECT, CLEAR_RECT, CONFIRM_RECT, ...CHIP_RECTS.map(({ rect }) => rect)]
      .some((rect) => contains(rect, point));
  canvas.style.cursor = game.state.isDraggingLid ? "grabbing" :
    overLid ? "grab" : overChatButton || overBetButton ? "pointer" : "default";
}, options);

function stopDrag(event: PointerEvent): void {
  if (draggingPointerId !== event.pointerId) return;
  game.stopLidDrag();
  draggingPointerId = null;
  if (canvas!.hasPointerCapture(event.pointerId)) canvas!.releasePointerCapture(event.pointerId);
}
canvas.addEventListener("pointerup", stopDrag, options);
canvas.addEventListener("pointercancel", stopDrag, options);
canvas.addEventListener("lostpointercapture", stopDrag, options);

chatInput.addEventListener("keydown", (event) => {
  // Enter trong lúc bộ gõ đang ghép chữ không được gửi tin nhắn sớm.
  if (event.key === "Enter" && !event.isComposing) {
    event.preventDefault();
    if (sendChat(chatInput.value)) chatInput.value = "";
  }
}, options);

const resizeObserver = new ResizeObserver(() => {
  renderer.resize();
  renderer.render(game.state);
});
resizeObserver.observe(canvas);
renderer.resize();
renderer.render(game.state);

let frameId = 0;
let previousFrame = 0;
function frame(timestamp: number): void {
  if (timestamp - previousFrame >= 1000 / 60) {
    renderer.render(game.state);
    previousFrame = timestamp;
  }
  frameId = requestAnimationFrame(frame);
}
frameId = requestAnimationFrame(frame);
socket.connect();

function dispose(): void {
  cancelAnimationFrame(frameId);
  resizeObserver.disconnect();
  events.abort();
  unbindSocketEvents();
  socket.disconnect();
}
window.addEventListener("beforeunload", dispose, options);
import.meta.hot?.dispose(dispose);
