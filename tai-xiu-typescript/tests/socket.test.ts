import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { Server } from "socket.io";
import type { Socket } from "socket.io";
import { GameModel } from "../src/game";
import { bindSocketEvents, createGameSocket } from "../src/socket";
import type { ClientToServerEvents, ServerToClientEvents } from "../src/types";

async function waitFor(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 2000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error("Hết thời gian chờ trạng thái game.");
    await delay(10);
  }
}

test("Socket.IO: sync, gửi cược, chat trong lúc chờ kết quả, reset, mất kết nối", {
  timeout: 10_000,
}, async (t) => {
  const httpServer = createServer();
  const server = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);
  const listening = once(httpServer, "listening");
  httpServer.listen(0, "127.0.0.1");
  await listening;
  const address = httpServer.address();
  assert.ok(address && typeof address !== "string");

  const game = new GameModel();
  const socket = createGameSocket(`http://127.0.0.1:${address.port}`);
  const unbind = bindSocketEvents(socket, game, 100);
  t.after(async () => {
    unbind();
    socket.disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const remotePromise = new Promise<Socket<ClientToServerEvents, ServerToClientEvents>>(
    (resolve) => server.once("connection", resolve),
  );
  const connected = new Promise<void>((resolve) => socket.once("connect", () => resolve()));
  socket.connect();
  const remote = await remotePromise;
  await connected;
  assert.equal(game.state.connected, true);

  const synced = new Promise<void>((resolve) => socket.once("sync_game_state", () => resolve()));
  remote.emit("sync_game_state", { time_left: 12, waiting_for_open: false, online_count: 42 });
  await synced;
  assert.equal(game.state.timeLeft, 12);
  assert.equal(game.state.onlineCount, 42);

  game.selectSide("TAI");
  game.addChip(1_000_000);
  const bet = game.confirmBet();
  assert.ok(bet);
  const receivedBet = once(remote, "place_bet");
  socket.emit("place_bet", bet);
  assert.deepEqual((await receivedBet)[0], { side: "TAI", amount: 1_000_000 });

  const resultReceived = new Promise<void>((resolve) => socket.once("game_result", () => resolve()));
  remote.emit("game_result", { dice: [4, 5, 6], result_side: "TAI", hist_char: "T" });
  await resultReceived;
  assert.equal(game.state.waitingForOpen, true);
  assert.equal(game.state.playerBalance, 50_900_000);

  const outgoingChat = once(remote, "send_chat");
  socket.emit("send_chat", { message: "Theo Tai!" });
  assert.deepEqual((await outgoingChat)[0], { message: "Theo Tai!" });
  const incomingChat = new Promise<void>((resolve) => socket.once("new_chat", () => resolve()));
  remote.emit("new_chat", { sender: "Bạn chơi", message: "Chúc mừng!", color: [10, 20, 30] });
  await incomingChat;
  assert.deepEqual(game.state.chatMessages.at(-1), {
    sender: "Bạn chơi", message: "Chúc mừng!", color: [10, 20, 30],
  });
  await waitFor(() => !game.state.waitingForOpen);
  assert.equal(game.state.totalBet, 0);
  assert.equal(game.state.hasBetted, false);

  const disconnected = new Promise<void>((resolve) => socket.once("disconnect", () => resolve()));
  remote.disconnect(true);
  await disconnected;
  assert.equal(game.state.connected, false);
  assert.equal(game.state.gameStatus, "MẤT KẾT NỐI VỚI SERVER!");
});
