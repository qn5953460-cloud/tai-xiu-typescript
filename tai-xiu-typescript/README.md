# Tài Xỉu Online — TypeScript

Chuyển toàn bộ **mã client Python/Pygame được cung cấp** sang TypeScript. Giao diện chạy trong trình duyệt với HTML Canvas; Socket.IO tiếp tục dùng máy chủ hiện có. Mã nguồn được gửi không chứa mã server, nên dự án này không có bản chuyển đổi backend.

## Chạy dự án

Cài Node.js 22.12 trở lên, mở terminal trong thư mục dự án và chạy:

```sh
npm install
npm run dev
```

Mở địa chỉ được terminal hiển thị, mặc định `http://127.0.0.1:5173`.

```sh
npm run typecheck  # Kiểm tra TypeScript
npm test           # Kiểm tra logic và giao tiếp Socket.IO với server thử nghiệm cục bộ
npm run build      # Tạo bản chạy trong dist/
npm run preview    # Xem bản đã build qua HTTP
```

Không mở trực tiếp `index.html` bằng `file://`; chạy qua máy chủ HTTP ở trên.

## Chức năng đã chuyển

- Bàn chơi có kích thước gốc 1250 × 750 và tự co theo chiều rộng cửa sổ.
- Số dư ban đầu 50.000.000; mười mệnh giá chip như bản Python.
- Chọn TÀI/XỈU, cộng chip, xóa cược, gửi cược và khóa sửa sau khi xác nhận.
- Nhận thời gian, số người online và xúc xắc từ server.
- Ba xúc xắc, đĩa và nắp bát có thể kéo bằng chuột hoặc cảm ứng.
- Nhận kết quả; thắng được cộng tiền cược trừ phí 10%, thua bị trừ tiền cược.
- Reset cược/nắp sau 4 giây; giữ tối đa 16 kết quả lịch sử.
- Chat online, bốn câu nhanh và năm biểu tượng dạng chữ giữ nguyên như nguồn.
- Ô chat tối đa 25 ký tự; hỗ trợ bộ gõ tiếng Việt, Backspace và Enter.
- Báo mất kết nối/lỗi kết nối; ngắt socket và dọn bộ hẹn giờ khi đóng trang.

## Cấu hình máy chủ

URL mặc định được giữ từ mã gốc:

```text
https://tai-xiu-server.onrender.com
```

Muốn đổi URL, sao chép `.env.example` thành `.env`, sửa `VITE_SOCKET_URL`, rồi khởi động lại `npm run dev` (hoặc build lại).

Trình duyệt cần server cho phép origin của trang qua CORS. Nếu bản Python kết nối được nhưng bản web báo lỗi CORS, cấu hình origin được phép ở server Socket.IO. Việc kết nối với server công khai phụ thuộc vào tình trạng server và cấu hình của server; kiểm thử trong dự án dùng server cục bộ.

| Chiều | Sự kiện | Dữ liệu |
| --- | --- | --- |
| Nhận | `sync_game_state` | `time_left`, `waiting_for_open`, `online_count`, `dice` |
| Nhận | `game_result` | `dice`, `result_side`, `hist_char` |
| Nhận | `new_chat` | `sender`, `message`, `color` |
| Gửi | `place_bet` | `{ side: "TAI" hoặc "XIU", amount: number }` |
| Gửi | `send_chat` | `{ message: string }` |

## Các tệp chính

- `src/main.ts`: vòng lặp vẽ, kéo nắp, vùng nhấn, nhập chat.
- `src/renderer.ts`: toàn bộ phần vẽ thay cho Pygame.
- `src/game.ts`: trạng thái, chip, thắng/thua, reset và định dạng tiền.
- `src/socket.ts`: khởi tạo và xử lý sự kiện Socket.IO.
- `src/types.ts`: kiểu dữ liệu và hợp đồng sự kiện.
- `src/layout.ts`, `src/constants.ts`: tọa độ, màu, kích thước, mệnh giá.
- `src/style.css`, `index.html`: khung trình duyệt và ô nhập chat.

## Hành vi giữ từ mã nguồn

Số dư và quyết toán vẫn được tính tại client. Giống bản Python, khi nhận `game_result`, điều kiện tính thắng/thua dựa vào cửa đã chọn và tổng tiền cược, không kiểm tra `has_betted`. Việc xác nhận vẫn khóa sửa cược và gửi `place_bet` lên server. Đồng hồ chỉ cập nhật từ `sync_game_state`, không tự đếm trong client.

Một số điều chỉnh phù hợp với trình duyệt: nhãn hiển thị có dấu tiếng Việt, ô chat dùng input HTML, chat dài được cắt trong khung, tọa độ nhấn được quy đổi khi co giãn; lỗi kết nối được hiển thị và trạng thái mất kết nối không bị reset vòng mới ghi đè.

Tài liệu thư viện: [Socket.IO TypeScript](https://socket.io/docs/v4/typescript/), [Vite](https://vite.dev/guide/).
