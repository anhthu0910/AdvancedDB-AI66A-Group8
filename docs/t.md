
---

## Đề tài 6: Hệ thống Lưu trữ Nhật ký Giao dịch Tài chính (Financial Transaction Ledger)
### Môn: Database Advanced

---

## 1. Giới thiệu đề tài

Trong hệ thống tài chính hiện đại, mỗi giây có hàng trăm đến hàng nghìn giao dịch xảy ra đồng thời — nạp tiền, rút tiền, chuyển khoản. Bài toán đặt ra là: làm thế nào để ghi nhận toàn bộ giao dịch với tốc độ cao, đồng thời vẫn truy vấn lịch sử tức thì mà không có độ trễ?

Cơ sở dữ liệu quan hệ truyền thống (MySQL, PostgreSQL) bắt đầu suy giảm hiệu năng khi bảng chứa hàng trăm triệu dòng. Đề tài này chọn **Apache Cassandra** — một cơ sở dữ liệu NoSQL dạng Column-Family — vì khả năng ghi phân tán tốc độ cao và đọc cực nhanh theo Partition Key.

**Mục tiêu cuối kỳ:** Xây dựng hệ thống có thể ghi ~500 giao dịch/giây liên tục, trong khi người dùng vẫn tra cứu sao kê theo tài khoản tức thì. Minh chứng thông qua giao diện Transaction Explorer hiển thị log cuộn realtime và bảng sao kê truy vấn theo `account_id`.

---

## 2. Phân công vai trò nhóm

| STT | Thành viên | Vai trò | Công việc chính | Tech stack |
|---|---|---|---|---|
| 1 | Lân | DB Architect & DB Administrator | Thiết kế schema Cassandra, Partition Key, Clustering Key, Materialized View, TTL | Apache Cassandra, DataStax Astra DB, DBeaver / DataStax Studio |
| 2 | Khang | Backend Dev 1 — Data Ingestion | Xây dựng Data Generator, Bulk Insert/Async Write ~500 tx/giây, tính throughput realtime | Node.js, cassandra-driver, Faker |
| 3 | Hiền | Backend Dev 2 — Data Query | RESTful API truy vấn theo account_id, bộ lọc loại giao dịch + khoảng thời gian, kênh WebSocket/SSE realtime | Node.js, cassandra-driver, Socket.io |
| 4 | Thư | Frontend Developer UX/UI | Giao diện Transaction Explorer: terminal log realtime (trái) + bảng sao kê tìm kiếm (phải) | ReactJS, Recharts, Tailwind CSS, Socket.io-client, react-virtualized |

---

## 3. Thiết kế schema Cassandra

Đây là trọng tâm kỹ thuật của đề tài. Toàn bộ thiết kế xoay quanh nguyên tắc: **mô hình hóa dữ liệu theo truy vấn**, không theo quan hệ thực thể như SQL.

### 3.1 Keyspace

```sql
CREATE KEYSPACE IF NOT EXISTS finance_ledger
WITH replication = {
  'class': 'SimpleStrategy',
  'replication_factor': 1
};
```

> Trong môi trường production thực tế, `replication_factor` nên đặt là 3 và dùng `NetworkTopologyStrategy`. Ở đây dùng `SimpleStrategy` cho môi trường local/demo.

### 3.2 Bảng chính — transactions

```sql
CREATE TABLE IF NOT EXISTS finance_ledger.transactions (
    account_id       TEXT,
    transaction_time TIMESTAMP,
    transaction_id   UUID,
    type             TEXT,
    amount           DECIMAL,
    description      TEXT,
    PRIMARY KEY (account_id, transaction_time, transaction_id)
) WITH CLUSTERING ORDER BY (transaction_time DESC, transaction_id ASC)
  AND default_time_to_live = 31536000;
```

**Giải thích thiết kế:**

`account_id` được chọn làm **Partition Key** vì toàn bộ lịch sử giao dịch của một tài khoản cần nằm cùng một node vật lý. Khi Frontend truy vấn theo `account_id`, Cassandra biết chính xác node nào lưu dữ liệu đó — không cần scan toàn bảng — dù hệ thống có hàng tỉ dòng.

`transaction_time DESC` là **Clustering Key** thứ nhất, đảm bảo các giao dịch mới nhất luôn nằm đầu tiên trong partition. Người dùng xem sao kê sẽ thấy giao dịch gần nhất trước mà không cần ORDER BY tốn kém.

`transaction_id` (UUID) là **Clustering Key** thứ hai, đảm bảo tính duy nhất khi hai giao dịch xảy ra cùng millisecond.

`default_time_to_live = 31536000` là TTL mặc định bằng 1 năm (tính bằng giây). Cassandra tự động xóa các dòng hết hạn mà không cần job định kỳ — thỏa mãn yêu cầu tự xóa log giao dịch cũ hơn 1 năm.

### 3.3 Materialized View — theo loại giao dịch

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS finance_ledger.transactions_by_type AS
    SELECT * FROM finance_ledger.transactions
    WHERE type IS NOT NULL
      AND account_id IS NOT NULL
      AND transaction_time IS NOT NULL
      AND transaction_id IS NOT NULL
PRIMARY KEY (type, transaction_time, account_id, transaction_id)
WITH CLUSTERING ORDER BY (transaction_time DESC);
```

**Lý do cần Materialized View:** Bảng chính tổ chức theo `account_id`. Nếu muốn lọc tất cả giao dịch loại "transfer" mà không có View này, Cassandra phải scan toàn bảng — rất chậm. View này tổ chức lại dữ liệu theo `type` làm Partition Key, cho phép truy vấn tổng hợp theo loại giao dịch tức thì. Cassandra tự động đồng bộ View mỗi khi bảng chính có dữ liệu mới.

---

## 4. Kiến trúc hệ thống

```
[Data Generator]  ──write──▶  [Backend Dev 1 API]  ──Bulk Insert──▶  [Cassandra]
                                                                            │
                                                                       read │
                                                                            ▼
[Frontend React]  ◀──REST/WebSocket──  [Backend Dev 2 API]  ◀──────────────┘
```

**Luồng ghi (Write path):** Data Generator (Node.js + Faker) tạo liên tục các giao dịch giả lập với tốc độ ~500 tx/giây. Backend Dev 1 dùng Bulk Insert và Async Write để đẩy vào Cassandra, đồng thời tính throughput thực tế và trả về Frontend qua kênh realtime.

**Luồng đọc (Read path):** Khi người dùng nhập `account_id` trên Frontend, request gửi đến Backend Dev 2. Server query Cassandra theo Partition Key, kết quả trả về tức thì do dữ liệu đã được tổ chức sẵn theo `account_id`. Backend Dev 2 cũng mở kênh WebSocket/SSE để đẩy log throughput realtime về Frontend.

---

## 5. Tiến độ hiện tại

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Nghiên cứu đề tài, phân công nhóm | ✅ Hoàn thành | |
| Nghiên cứu Apache Cassandra, CQL | ✅ H
oàn thành | |
| Thiết kế schema (Partition Key, Clustering Key, TTL, Materialized View) | ✅ Hoàn thành | Xem mục 3 |
| Thiết kế kiến trúc hệ thống | ✅ Hoàn thành | Xem mục 4 |
| Cài đặt môi trường Cassandra (Docker / Astra DB) | ⏳ Đang thực hiện | |
| Kết nối Node.js với Cassandra qua DataStax driver | ⏳ Đang thực hiện | |
| Xây dựng Data Generator & Write API (Dev 1) | ⏳ Đang thực hiện | |
| Xây dựng Read API & bộ lọc (Dev 2) | ⏳ Đang thực hiện | |
| Xây dựng giao diện Transaction Explorer (Frontend) | ⏳ Đang thực hiện | |
| Tích hợp WebSocket/SSE realtime | ⏳ Chưa bắt đầu | |
| Demo tổng thể | ⏳ Chưa bắt đầu | Dự kiến báo cáo lần 2 |
---

## 6. Khó khăn dự kiến & hướng giải quyết

**Đồng bộ giữa Dev 1 và Dev 2:** Hai backend cần thống nhất schema và cấu trúc dữ liệu trước khi code song song. Hướng giải quyết: DB Architect (Thành viên 1) hoàn thiện schema trước, cả nhóm review và chốt trước khi ai bắt đầu code.

**Throughput 500 tx/giây:** Insert đơn lẻ không đủ tốc độ. Hướng giải quyết: dùng Batch Insert có kiểm soát hoặc Promise.all với nhiều insert bất đồng bộ song song.

**Materialized View trong Cassandra có giới hạn:** View không hỗ trợ mọi loại truy vấn như SQL. Hướng giải quyết: thiết kế truy vấn trước, sau đó mới tạo View phù hợp — không làm ngược lại.

---

## 7. Kế hoạch giai đoạn tiếp theo

| Tuần | Mục tiêu | Người thực hiện |
|---|---|---|
| Tuần tới | Cài Cassandra Docker, tạo keyspace + bảng, chạy CQL thành công | TV1 |
| Tuần tới | Kết nối Node.js + DataStax driver, insert thử 1 dòng | TV2, TV3 |
| Tuần +2 | Data Generator chạy được 100 tx/giây, API GET /transactions theo account_id | TV2, TV3 |
| Tuần +2 | Khung giao diện Frontend, hiển thị được JSON từ API | TV4 |
| Tuần +3 | Nâng throughput lên 500 tx/giây, thêm bộ lọc filter, tích hợp WebSocket | TV2, TV3 |
| Tuần +3 | Giao diện hoàn chỉnh, kết nối realtime | TV4 |
| Báo cáo lần 2 | Demo đầy đủ: terminal log cuộn + tra cứu account_id tức thì | Cả nhóm |

---
