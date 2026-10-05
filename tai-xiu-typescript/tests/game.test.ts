import assert from "node:assert/strict";
import test from "node:test";
import { BOWL_Y } from "../src/constants";
import { formatCurrencyShort, GameModel } from "../src/game";

function bet(game: GameModel, side: "TAI" | "XIU", amount = 1_000_000): void {
  game.onConnect();
  game.selectSide(side);
  game.addChip(amount);
  assert.deepEqual(game.confirmBet(), { side, amount });
}

test("định dạng mệnh giá giống bản gốc", () => {
  for (const [amount, expected] of [
    [0, "0"], [99, "99"], [1000, "1k"], [1500, "1.5k"],
    [500000, "500k"], [1000000, "1M"], [1500000, "1.5M"], [50000000, "50M"],
  ] as const) assert.equal(formatCurrencyShort(amount), expected);
});

test("xác nhận một lần, khóa toàn bộ thay đổi cược sau xác nhận", () => {
  const game = new GameModel();
  bet(game, "TAI");
  game.selectSide("XIU");
  game.addChip(1000);
  game.clearBet();
  assert.equal(game.state.selectedSide, "TAI");
  assert.equal(game.state.totalBet, 1_000_000);
  assert.equal(game.confirmBet(), null);
});

test("không cược vượt số dư hoặc dùng mệnh giá không tồn tại", () => {
  const game = new GameModel();
  game.addChip(50_000_000);
  game.addChip(1000);
  game.addChip(-1000);
  game.addChip(1234);
  assert.equal(game.state.totalBet, 50_000_000);
  game.clearBet();
  assert.equal(game.state.totalBet, 0);
  assert.equal(game.state.selectedSide, null);
});

test("cần kết nối, cửa cược và tiền cược để xác nhận", () => {
  const game = new GameModel();
  game.selectSide("TAI");
  game.addChip(1000);
  assert.equal(game.confirmBet(), null);
  game.onConnect();
  game.clearBet();
  game.addChip(1000);
  assert.equal(game.confirmBet(), null);
  game.clearBet();
  game.selectSide("XIU");
  assert.equal(game.confirmBet(), null);
});

test("hết thời gian hoặc chờ mở bát thì không sửa/gửi cược", () => {
  for (const data of [
    { time_left: 0, waiting_for_open: false },
    { time_left: 15, waiting_for_open: true },
  ]) {
    const game = new GameModel();
    game.onConnect();
    game.syncState(data);
    game.selectSide("TAI");
    game.addChip(1000);
    assert.equal(game.state.selectedSide, null);
    assert.equal(game.state.totalBet, 0);
    assert.equal(game.confirmBet(), null);
  }
});

test("thắng cộng 90% tiền cược, reset không xóa số dư/lịch sử/xúc xắc", () => {
  const game = new GameModel();
  bet(game, "TAI");
  game.applyResult({ dice: [4, 5, 6], result_side: "TAI", hist_char: "T" });
  assert.equal(game.state.playerBalance, 50_900_000);
  assert.equal(game.state.gameStatus, "THẮNG +900kđ!");
  assert.equal(game.state.waitingForOpen, true);
  game.state.lidY = 10;
  game.resetRound();
  assert.equal(game.state.playerBalance, 50_900_000);
  assert.deepEqual(game.state.historyResults, ["T"]);
  assert.deepEqual(game.state.diceResults, [4, 5, 6]);
  assert.equal(game.state.totalBet, 0);
  assert.equal(game.state.selectedSide, null);
  assert.equal(game.state.hasBetted, false);
  assert.equal(game.state.waitingForOpen, false);
  assert.equal(game.state.isCovered, true);
  assert.equal(game.state.lidY, BOWL_Y + 10);
});

test("thua trừ toàn bộ tiền cược; không chọn cược thì chỉ hiển thị kết quả", () => {
  const game = new GameModel();
  bet(game, "TAI");
  game.applyResult({ dice: [1, 2, 3], result_side: "XIU", hist_char: "X" });
  assert.equal(game.state.playerBalance, 49_000_000);
  assert.equal(game.state.gameStatus, "THUA -1Mđ! (6 ĐIỂM)");
  game.resetRound();
  game.applyResult({ dice: [2, 2, 2], result_side: "XIU", hist_char: "X" });
  assert.equal(game.state.playerBalance, 49_000_000);
  assert.equal(game.state.gameStatus, "KẾT QUẢ: 6 ĐIỂM (XIU)");
});

test("giữ điều kiện quyết toán của Python ngay cả khi chưa xác nhận", () => {
  const game = new GameModel();
  game.selectSide("XIU");
  game.addChip(1000);
  game.applyResult({ dice: [1, 2, 3], result_side: "XIU", hist_char: "X" });
  assert.equal(game.state.playerBalance, 50_000_900);
});

test("chat và lịch sử chỉ giữ số lượng giới hạn", () => {
  const game = new GameModel();
  for (let i = 0; i < 25; i++) {
    game.addChat("User", `message ${i}`);
    game.applyResult({ hist_char: i % 2 === 0 ? "T" : "X" });
    game.resetRound();
  }
  assert.equal(game.state.chatMessages.length, 14);
  assert.equal(game.state.chatMessages[0].message, "message 11");
  assert.equal(game.state.historyResults.length, 16);
  assert.equal(game.state.historyResults[0], "X");
});

test("kéo nắp có giới hạn và mở hẳn khi kéo đủ cao", () => {
  const game = new GameModel();
  game.startLidDrag(110);
  game.moveLid(500);
  assert.equal(game.state.lidY, BOWL_Y + 120);
  game.moveLid(0);
  assert.equal(game.state.lidY, BOWL_Y - 80);
  assert.equal(game.state.isCovered, false);
  game.stopLidDrag();
  game.moveLid(500);
  assert.equal(game.state.lidY, BOWL_Y - 80);
});

test("payload rỗng dùng giá trị mặc định; xúc xắc lỗi không làm vỡ renderer", () => {
  const game = new GameModel();
  game.syncState({ time_left: 7, online_count: 8, dice: [6, 4, 2] });
  assert.deepEqual(game.state.diceResults, [6, 4, 2]);
  game.syncState({ dice: [0, 7, 3] });
  assert.deepEqual(game.state.diceResults, [1, 1, 1]);
  assert.equal(game.state.timeLeft, 15);
  assert.equal(game.state.onlineCount, 1);
  game.applyResult({});
  assert.equal(game.state.gameStatus, "KẾT QUẢ: 3 ĐIỂM (TAI)");
  assert.deepEqual(game.state.historyResults, ["T"]);
});

test("reset sau mất kết nối không hiển thị trạng thái đã kết nối", () => {
  const game = new GameModel();
  game.onConnect();
  game.onDisconnect();
  game.resetRound();
  assert.equal(game.state.connected, false);
  assert.equal(game.state.gameStatus, "MẤT KẾT NỐI VỚI SERVER!");
});
