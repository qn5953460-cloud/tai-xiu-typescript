import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import { RESULT_DISPLAY_MS } from "./constants";
import { GameModel } from "./game";
import type { ClientToServerEvents, ServerToClientEvents } from "./types";

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createGameSocket(url: string): GameSocket {
  return io(url, { autoConnect: false });
}

export function bindSocketEvents(
  socket: GameSocket,
  game: GameModel,
  resultDisplayMs = RESULT_DISPLAY_MS,
): () => void {
  let resetTimer: ReturnType<typeof setTimeout> | undefined;
  const onConnect = (): void => game.onConnect();
  const onDisconnect = (): void => game.onDisconnect();
  const onError = (error: Error): void => {
    game.onConnectionError();
    console.error("Lỗi kết nối server:", error.message);
  };
  const onSync: ServerToClientEvents["sync_game_state"] = (data) => game.syncState(data);
  const onChat: ServerToClientEvents["new_chat"] = (data) => game.receiveChat(data);
  const onResult: ServerToClientEvents["game_result"] = (data) => {
    if (resetTimer !== undefined) clearTimeout(resetTimer);
    game.applyResult(data);
    // Thay asyncio.sleep(4); giao diện và chat vẫn tiếp tục hoạt động trong lúc chờ.
    resetTimer = setTimeout(() => {
      game.resetRound();
      resetTimer = undefined;
    }, resultDisplayMs);
  };

  socket.on("connect", onConnect);
  socket.on("disconnect", onDisconnect);
  socket.on("connect_error", onError);
  socket.on("sync_game_state", onSync);
  socket.on("game_result", onResult);
  socket.on("new_chat", onChat);

  return () => {
    if (resetTimer !== undefined) clearTimeout(resetTimer);
    socket.off("connect", onConnect);
    socket.off("disconnect", onDisconnect);
    socket.off("connect_error", onError);
    socket.off("sync_game_state", onSync);
    socket.off("game_result", onResult);
    socket.off("new_chat", onChat);
  };
}
