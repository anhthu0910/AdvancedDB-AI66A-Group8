# Financial Transaction Ledger

> **Đề tài 6** — Hệ thống Lưu trữ Nhật ký Giao dịch Tài chính  
> **Công nghệ cốt lõi:** Apache Cassandra 4.1 · Node.js · React + Vite  
> **Nhóm:** AI66A — Group 8

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Yêu cầu cài đặt](#2-yêu-cầu-cài-đặt)
3. [Cấu trúc thư mục](#3-cấu-trúc-thư-mục)
4. [Khởi động nhanh](#4-khởi-động-nhanh-docker)
5. [Chạy thủ công (không Docker)](#5-chạy-thủ-công-không-docker)
6. [Tầng Database](#6-tầng-database)
7. [Tầng Backend](#7-tầng-backend)
8. [Tầng Frontend](#8-tầng-frontend)
9. [Luồng dữ liệu end-to-end](#9-luồng-dữ-liệu-end-to-end)
10. [Biến môi trường](#10-biến-môi-trường)
11. [Câu hỏi thường gặp](#11-câu-hỏi-thường-gặp)

---

## 1. Tổng quan hệ thống

Hệ thống mô phỏng một ledger giao dịch ngân hàng hiệu năng cao, được xây dựng xung quanh đặc điểm nổi bật của **Apache Cassandra**: ghi tốc độ cao, phân tán, và đọc tức thì theo Partition Key.

```
┌─────────────────────────────────────────────────────────────┐
│                 Transaction Explorer UI                     │
│                                                             │
│    ┌─────────────────────┐   ┌─────────────────────────┐    │
│    │   Terminal Panel    │   │    Explorer Panel       │    │
│    │  (Ingestion Stream) │   │  (Query by account_id)  │    │
│    │                     │   │                         │    │
│    │  [Tạo luồng GD]     │   │  account_id = [ACC001]  │    │
│    │  ~500 tx/giây       │   │  → sao kê tức thì       │    │
│    │  Socket.IO real-time│   │  → filter theo type/date│    │
│    └─────────────────────┘   └─────────────────────────┘    │
└───────────────────────┬──────────────────┬──────────────────┘
                        │ REST / WebSocket │
┌───────────────────────▼──────────────────▼───────────────────┐
│                   Express + Socket.IO (Node.js)              │
│  POST /ingestion/batch    GET /transactions/:accountId       │
│  Socket: stream:start     GET /transactions/by-type/:type    │
└───────────────────────────────────┬──────────────────────────┘
                                    │ cassandra-driver
┌───────────────────────────────────▼──────────────────────────┐
│                     Apache Cassandra 4.1                     │
│                                                              │
│   Keyspace: ledger         │  Materialized View:             │
│   10 bảng                  │  transactions_by_type           │
│                            │                                 │
│   Partition Key: account_id│  Partition Key: type            │
│   → gom data 1 TK = 1 node │  → query theo loại GD O(1)      │
│   → read sao kê O(1)       │                                 │
└──────────────────────────────────────────────────────────────┘
```

### Tính năng chính

| Tính năng | Mô tả |
|-----------|-------|
| **Ghi tốc độ cao** | `Promise.all` parallel insert — ~500 tx/giây trên dev single-node |
| **Partition Key read** | Toàn bộ GD của 1 tài khoản nằm cùng node → đọc sao kê O(1) |
| **Materialized View** | Query theo `type` (DEPOSIT/TRANSFER/...) không cần full table scan |
| **TTL tự động** | Cassandra tự xóa GD cũ hơn 1 năm — không cần cron job |
| **Real-time stream** | Socket.IO đẩy log GD liên tục lên UI với throughput thực tế |
| **Seed generator** | Script Node.js sinh hàng chục nghìn GD ngẫu nhiên |

---

## 2. Yêu cầu cài đặt

### Chạy bằng Docker (khuyến nghị)

| Phần mềm | Phiên bản tối thiểu |
|----------|---------------------|
| Docker Desktop | 24.x trở lên |
| Docker Compose | v2.x (tích hợp sẵn trong Docker Desktop) |
| RAM khả dụng | **≥ 4 GB** (Cassandra cần ít nhất 2 GB heap) |

### Chạy thủ công

| Phần mềm | Phiên bản |
|----------|-----------|
| Node.js | 18.x hoặc 20.x |
| npm | 9.x trở lên |
| Apache Cassandra | 4.1 (local hoặc Docker) |
| Java | 11 (yêu cầu bởi Cassandra) |

---

## 3. Cấu trúc thư mục
```
AdvancedDB-AI66A-Group8/
├── README.md                     # Hướng dẫn setup, chạy, cấu trúc repo
├── .gitignore                    # Bỏ qua node_modules, .env, build/, .DS_Store
├── .env                          # Biến môi trường (tự tạo vì đã gitignore)
├── docker-compose.yml            # Khởi động toàn bộ stack
│
├── database/                     ← DB architect
│   ├── keyspace.cql            │  1. Tạo keyspace "ledger"
│   ├── schema.cql              │  2. Tạo 10 bảng chính
│   ├── mv_setup.cql            │  3. Materialized View
│   ├── indexes.cql             │  4. Secondary Index
│   └── seed_data.cql           │  5. Dữ liệu mẫu nhỏ (optional)
│
├── backend/                      ← Node.js API server
|   ├── src/
|   │   ├── app.js                  # Entry point — Express + Socket.IO
|   │   ├── config/env.js           # Biến môi trường
|   │   ├── db/
|   │   │   ├── client.js           # Cassandra singleton, connection pool, helpers
|   │   │   └── queries.js          # Toàn bộ CQL query 
|   │   ├── seed/index.js           # Sinh dữ liệu lớn cho cả 10 bảng
|   │   ├── services/
|   │   │   ├── transactionService.js   # Logic đọc/ghi transactions + MV query
|   │   │   ├── accountService.js       # Logic đọc accounts, summary, methods, alerts, notifs
|   │   │   └── ingestionService.js     # Stream ghi liên tục ~500 tx/s cho demo
|   │   ├── controllers/ (3 file)
|   │   ├── routes/index.js             # Toàn bộ route definitions - REST endpoints
|   │   ├── middleware/errorHandler.js
|   │   └── utils/socketHandler.js      # Socket.IO events: stream:start / stream:stop events
|   ├── .env.example
|   ├── package.json
|   └── Dockerfile                  # Dockerfile cho backend
│
└── frontend/                   ← React + Vite UI
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── styles/global.css               # Design tokens, animations, scrollbar
        ├── api/index.js                    # REST calls khớp chính xác routes backend
        ├── hooks/useSocket.js              # Socket.IO hook
        ├── utils/format.js                 # Định dạng số/ngày/màu
        ├── components/
        │   ├── shared/                     # Badge, Spinner, StatCard
        │   ├── terminal/                   # TerminalPanel (nửa trái): ingestion stream live
        │   └── explorer/                   # ExplorerPanel (nửa phải) 
        │       ├── SearchBar               # Ô tìm kiếm account_id
        │       ├── FilterBar               # Type pills + date range + limit
        │       ├── AccountCard             # Thông tin tài khoản
        │       ├── TransactionTable        # Bảng giao dịch có animation slide-in
        │       ├── AlertsPanel             # Fraud alerts strip
        │       └── ExplorerPanel           # Orchestrator nửa phải
        └── pages/TransactionExplorer.jsx   # Trang chính: layout split 48/4/48
```

---

## 4. Khởi động nhanh (Docker)

Đây là cách nhanh nhất để chạy toàn bộ hệ thống.

### Bước 1 — Clone và chuẩn bị Dockerfile

Đặt các file sau vào đúng vị trí (nếu chưa có):

```
backend/Dockerfile      ← (xem nội dung bên dưới)
frontend/Dockerfile     ← (xem nội dung bên dưới)
frontend/nginx.conf     ← (xem nội dung bên dưới)
```

**`backend/Dockerfile`**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
EXPOSE 3000
CMD ["node", "src/app.js"]
```

**`frontend/Dockerfile`**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**`frontend/nginx.conf`**
```nginx
server {
    listen 80;
    location / {
        root   /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
    }
    location /socket.io/ {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Bước 2 — Khởi động stack

```bash
# Từ thư mục gốc
docker compose up -d 
```
Lần đầu compose up thì chạy:
```bash
docker compose up cassandra-init
```
Chờ khoảng 30-60s để docker khởi động. Sau đó kiểm tra trạng thái docker container:
``` bash
dock ps
```
Nếu thấy trạng thái `healthy` là đã khởi động thành công

Docker sẽ tự động:
1. Kéo image Cassandra 4.1
2. Khởi động Cassandra và chờ healthy (~60 giây)
3. Chạy `cassandra-init`: thực thi keyspace.cql → schema.cql → mv_setup.cql → indexes.cql
4. Build và khởi động backend Node.js
5. Build và khởi động frontend Vite + nginx

**Kiểm tra trạng thái container:**
```bash
# Xem trạng thái container
docker ps 
```
Nếu cột STATUS hiển thị trạng thái (healthy) nghĩa là cassandra đã khởi động thành công

Verify schema đã được tạo:
```bash
# Kiểm tra keyspace có tồn tại không
docker exec -it cassandra cqlsh -e "DESCRIBE KEYSPACES;"

# Kiểm tra cấu trúc bảng transactions
docker exec -it cassandra cqlsh -e "DESCRIBE TABLE ledger.transactions;"

# Vào cqlsh để test keyspace
docker exec -i cassandra cqlsh 
# để thoát ra nhấn Ctrl + D
```

Kết quả mong đợi:
# Kết nối vào Cassandra và chạy các script theo thứ tự:
docker exec -i cassandra cqlsh < database/keyspace.cql
docker exec -i cassandra cqlsh < database/schema.cql
docker exec -i cassandra cqlsh < database/mv_setup.cql
```

Hoặc gộp 1 lệnh:

```
bashcat database/keyspace.cql database/schema.cql database/mv_setup.cql \
  | docker exec -i cassandra cqlsh
```

**Lưu ý về docker-compose:**

Cassandra official Docker image không tự chạy file .cql khi khởi động
(không giống PostgreSQL có docker-entrypoint-initdb.d).
Phải chạy script thủ công sau khi container healthy, hoặc dùng
entrypoint script wrapper.

### Keyspace & Biến môi trường:
| Biến | Giá trị |
|-----------|-----------|
| CASSANDRA_KEYSPACE | financial_ledger|
| CASSANDRA_DC | datacenter1 |
| CASSANDRA_HOST | localhost (hoặc cassandra nếu trong Docker network) |

### Tóm tắt thiết kế schema:
```
transactions
├── PARTITION KEY:   account_id         → gom giao dịch 1 tài khoản vào 1 node
├── CLUSTERING KEY1: transaction_time DESC → giao dịch mới đọc trước
├── CLUSTERING KEY2: transaction_id     → tránh overwrite, idempotent insert
├── TTL:             1 năm (31536000s)  → tự xóa log cũ
└── Compaction:      TWCS               → tối ưu time-series, hiệu quả với TTL

transactions_by_type (Materialized View)
└── PARTITION KEY:   type               → filter nhanh theo loại giao dịch
```

## Hướng dẫn chạy:

### Cách 1:

Truy cập ứng dụng tại:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000

### Cách 2: Chạy local (thủ công)


### Bước 3 — Theo dõi tiến trình

```bash
# Xem log tất cả services, thoát ra nhấn Ctrl + D
docker compose logs -f

# Chỉ xem log init schema
docker compose logs cassandra-init

# Kiểm tra Cassandra đã tạo schema chưa
docker exec cassandra cqlsh -e "DESCRIBE TABLES" ledger
```


### Bước 4 — Sinh dữ liệu

```bash
# Seed dữ liệu vừa (50 users, 150 accounts, 30.000 txns)
docker exec backend node src/seed/index.js

# Seed dữ liệu lớn hơn
docker exec backend node src/seed/index.js --users=200 --accounts=600 --txns=50000
```

### Bước 5 — Truy cập

| Service | URL |
|---------|-----|
| **UI (Transaction Explorer)** | http://localhost:5173 |
| **Backend API** | http://localhost:3000/api/health |
| **Cassandra cqlsh** | `docker exec -it cassandra cqlsh` |

### Dừng hệ thống

```bash
docker compose down          # Dừng, giữ data
docker compose down -v       # Dừng và xóa toàn bộ data Cassandra
```
Nếu không được:
```bash
sudo aa-remove-unknown
sudo systemctl daemon-reload
sudo systemctl restart docker
docker compose down -v
```

---

## 5. Chạy thủ công (không Docker)

Dùng khi cần debug hoặc phát triển từng phần riêng.

### Bước 1 — Khởi động Cassandra

```bash
# Cách A: Dùng Docker cho Cassandra, chạy backend/frontend local
docker run -d \
  --name cassandra \
  -p 9042:9042 \
  -e CASSANDRA_DC=datacenter1 \
  -e MAX_HEAP_SIZE=512M \
  -e HEAP_NEWSIZE=100M \
  cassandra:4.1

# Cách B: Cassandra cài local (không khuyến khích)
# Tải tại: https://cassandra.apache.org/download/
# Khởi động: cassandra -f
```

### Bước 2 — Chờ Cassandra sẵn sàng

```bash
# Chờ cho đến khi lệnh này thành công (có thể mất 30-60 giây)
docker exec cassandra cqlsh -e "SELECT now() FROM system.local;"
# Kết quả mong đợi: 1 row với giá trị timestamp
```

### Bước 3 — Khởi tạo schema

```bash
# Chạy tuần tự 4 file CQL
docker exec -i cassandra cqlsh < database/keyspace.cql
docker exec -i cassandra cqlsh < database/schema.cql
docker exec -i cassandra cqlsh < database/mv_setup.cql
docker exec -i cassandra cqlsh < database/indexes.cql

# Xác nhận
docker exec cassandra cqlsh -e "USE ledger; DESCRIBE TABLES;"
# Kết quả mong đợi: danh sách 10 bảng
```

### Bước 4 — Cài đặt và chạy Backend

```bash
cd backend

# Tạo file .env từ mẫu
cp .env.example .env
# Nội dung .env:
#   CASSANDRA_HOST=localhost
#   CASSANDRA_PORT=9042
#   CASSANDRA_KEYSPACE=ledger
#   CASSANDRA_DC=datacenter1
#   PORT=3000

npm install

# Sinh dữ liệu mẫu
npm run seed
# Hoặc nhiều hơn:
# node src/seed/index.js --users=100 --accounts=300 --txns=20000

# Khởi động server
npm run dev
# Terminal sẽ in: [Server] Running on http://localhost:3000
#                 [Cassandra] Connected — keyspace: ledger | DC: datacenter1
```

### Bước 5 — Cài đặt và chạy Frontend

Mở terminal mới:

```bash
cd frontend

npm install

npm run dev
# Terminal sẽ in: VITE ready at http://localhost:5173
```

### Bước 6 — Truy cập

Mở trình duyệt: **http://localhost:5173**

---

## 6. Tầng Database

### Keyspace

```
Tên: ledger
Replication: SimpleStrategy (dev) / NetworkTopologyStrategy (production)
Durable writes: true
```

### 10 Bảng và thiết kế

| # | Bảng | Partition Key | Clustering Key | TTL |
|---|------|---------------|----------------|-----|
| 1 | `users` | `user_id` | — | Không |
| 2 | `accounts` | `account_id` | — | Không |
| 3 | `transactions` | `account_id` | `txn_time DESC, txn_id` | **365 ngày** |
| 4 | `transaction_events` | `txn_id` | `event_time DESC, event_id` | 365 ngày |
| 5 | `payment_methods` | `account_id` | `method_id` | Không |
| 6 | `card_usage_log` | `method_id` | `used_at DESC, log_id` | **90 ngày** |
| 7 | `account_daily_summary` | `account_id` | `summary_date DESC` | 730 ngày |
| 8 | `notifications` | `account_id` | `sent_at DESC, notif_id` | **30 ngày** |
| 9 | `fraud_alerts` | `account_id` | `detected_at DESC, alert_id` | Không |
| 10 | `audit_logs` | `user_id` | `log_time DESC, log_id` | 365 ngày |

### Materialized View

```sql
-- transactions_by_type
-- Partition Key: type  →  tất cả DEPOSIT / WITHDRAW / TRANSFER gom cùng partition
-- Dùng khi: filter theo loại GD mà không scan toàn bảng
SELECT * FROM transactions_by_type WHERE type = 'DEPOSIT';
```

### Secondary Indexes

```sql
-- accounts_by_user: tìm tất cả TK của 1 user
SELECT * FROM accounts WHERE user_id = 'USR00001';

-- fraud_by_severity: lọc cảnh báo theo mức độ (luôn kèm account_id)
SELECT * FROM fraud_alerts WHERE account_id = 'ACC000001' AND severity = 'HIGH';
```

### Thứ tự khởi tạo

```
keyspace.cql → schema.cql → mv_setup.cql → indexes.cql
```

> ⚠️ **Lưu ý:** Cassandra Docker image không tự chạy `.cql` khi khởi động (khác PostgreSQL). Phải chạy thủ công hoặc qua `cassandra-init` service trong `docker-compose.yml`.

---

## 7. Tầng Backend

### 7.1 Công nghệ

| Package | Vai trò |
|---------|---------|
| `express` | HTTP server, routing |
| `socket.io` | Real-time stream ingestion |
| `cassandra-driver` | Kết nối Cassandra, prepared statements |
| `@faker-js/faker` | Sinh dữ liệu ngẫu nhiên cho seed |
| `express-validator` | Validate request input |

### 7.2 REST API - API Endpoints

| Method | Endpoint | Cassandra | Mô tả |
|--------|----------|-----------|-------|
| GET | `/api/health` | — | Health check |
| GET | `/api/accounts/:id` | `accounts` (Partition Key) | Lấy thông tin tài khoản |
| GET | `/api/users/:userId/accounts` | `accounts` (Secondary Index) | Lấy tất cả tài khoản của user |
| GET | `/api/accounts/:id/summary` | `account_daily_summary` | Lấy báo cáo ngày của tài khoản |
| GET | `/api/accounts/:id/methods` | `payment_methods` | Lấy phương thức thanh toán của tài khoản |
| GET | `/api/accounts/:id/notifications` | `notifications` | Lấy thông báo của tài khoản |
| GET | `/api/accounts/:id/alerts` | `fraud_alerts` | Lấy cảnh báo fraud của tài khoản |
| GET | `/api/transactions/:accountId` | `transactions` (Partition Key) | Lấy lịch sử giao dịch của tài khoản |
| GET | `/api/transactions/by-type/:type` | MV `transactions_by_type` | Lấy giao dịch theo loại |
| POST | `/api/transactions` | INSERT `transactions` | Tạo giao dịch mới |
| POST | `/api/ingestion/batch` | Bulk INSERT `transactions` | Ghi 1 batch giao dịch ngẫu nhiên |

**Query params cho `/api/transactions/:accountId`:**
```
?limit=50   # số row tối đa
?from=2025-01-01&to=2025-03-31    # lọc theo khoảng thời gian
?limit=100&from=2025-01-01&to=2025-01-31
```

### 7.3 Socket.IO Events

```
Client → Server:
  stream:start  { batchSize: 50, intervalMs: 100 }
  stream:stop

Server → Client:
  stream:tick   { written, tps, elapsed_ms, items[] }
  stream:error  { message }
```

### 7.4 Những quyết định thiết kế quan trọng
- `queries.js` — 1 file duy nhất cho tất cả CQL: tên column khớp chính xác với `schema.cql` (ví dụ `txn_time`, `txn_id`, không phải `transaction_time`). Khi schema thay đổi chỉ cần sửa 1 chỗ.
- `Promise.all` **thay vì** `client.batch()`: `ingestionService` và `seed` đều dùng `Promise.all` để ghi parallel — Cassandra batch không tăng throughput, chỉ dùng cho atomic write cùng partition.
- `ingestionService.startStream()` nhận `AbortController` signal từ `socketHandler` — khi client ngắt kết nối Socket.IO, stream dừng ngay lập tức, không leak.
- **Seed CLI args**: `node src/seed/index.js --users=200 --accounts=600 --txns=50000` — sinh dữ liệu có thể điều chỉnh không cần sửa code.

### 7.5 Tại sao `Promise.all` thay vì `client.batch()`

Cassandra `BATCH` không tăng throughput — coordinator phải serialize các statement trong batch. `Promise.all` khai thác connection pool thực sự song song:

```js
// ✗ Sai — batch không giúp gì về tốc độ với multi-partition
await client.batch([stmt1, stmt2, stmt3, ...]);

// ✓ Đúng — mỗi query dùng 1 connection trong pool → parallel thực sự
await Promise.all(items.map(item => client.execute(query, params)));
```

### 7.6 Seed generator

```bash
cd backend
cp .env.example .env
npm install

# Mặc định: 50 users, 150 accounts, ~30.000 txns
npm run seed
# Hoặc seed số lớn:
npm run seed:large   # 200 users, 600 accounts, 50000 txns

# Tuỳ chỉnh
node src/seed/index.js --users=200 --accounts=600 --txns=50000

# Output mẫu:
# ✓ users:              50 rows
# ✓ accounts:          150 rows
# ✓ transactions:   30.000 rows
# ✓ payment_methods:   312 rows
# ✓ card_usage_log:  2.184 rows
# ✓ ...
# ✅ Seed hoàn tất trong 18.3s | Tổng: ~37.000 rows

# Chạy dev server
npm run dev
```

---

## 8. Tầng Frontend

### 8.1 Công nghệ

| Package | Vai trò |
|---------|---------|
| `react` + `react-dom` | UI framework |
| `vite` | Build tool + dev server |
| `socket.io-client` | Nhận stream real-time |
| `axios` | REST API calls |
| `recharts` | Biểu đồ (nếu mở rộng) |
| `date-fns` | Định dạng ngày/giờ tiếng Việt |

### 8.2Giao diện — Transaction Explorer

```
┌──────────────────────────────────────────────────────────┐
│  ◈ Financial Ledger    [Transaction Explorer]  ● ledger  │
├─────────────────────────┬────────────────────────────────┤
│                         │                                │
│   cassandra@ledger:~$   │  Transaction Explorer          │
│                         │  account_id = [        ] QUERY │
│   ● LIVE   500 tx/s     │                                │
│                         │  ┌─ ACC000001 ──────────────┐  │
│   [Slow][Normal][Fast]  │  │ CHECKING  15,000,000 ₫   │  │
│   [Tạo luồng giao dịch] │  └──────────────────────────┘  │
│                         │                                │
│  0001 [12:34:01] ACC... │  [ALL][DEP][WIT][TRA][PAY]...  │
│  0002 [12:34:01] ACC... │                                │
│  0003 [12:34:01] ACC... │  txn_id  time   type  amount   │
│  0004 [12:34:02] ACC... │  a3f8… 12:34  DEPOSIT  +5M ₫   │
│  0005 [12:34:02] ACC... │  b7c2… 12:33  TRANSFER ↔2M ₫   │
│  ...                    │  ...                           │
│                         │                       12ms ✓   │
└─────────────────────────┴────────────────────────────────┘
```

**Nửa trái — Terminal Panel:**
- Nút **Tạo luồng giao dịch** → phát Socket.IO `stream:start`
- 3 preset: Slow (~100/s) | Normal (~500/s) | Fast (~1000/s)
- Log terminal cuộn thời gian thực: `txn_id | account | type | amount | status | channel`
- Hiển thị throughput thực tế (tx/s) và tổng GD đã ghi

**Nửa phải — Explorer Panel:**
- Ô tìm kiếm `account_id` → truy vấn Partition Key, đọc O(1)
- Account card: balance, loại TK, trạng thái, tiền tệ
- Filter type: `ALL` / `DEPOSIT` / `WITHDRAW` / `TRANSFER` / `PAYMENT` / `REFUND`
  - Khi chọn type cụ thể → dùng **Materialized View** `transactions_by_type`
- Date range filter + limit selector (20 / 50 / 100 / 200)
- Bảng GD với animation slide-in cho mỗi row mới
- Fraud alerts strip (nếu tài khoản có cảnh báo)
- Badge hiển thị thời gian query (ms)

### 8.3 Vite proxy (dev)

Trong `vite.config.js`, mọi request đến `/api` và `/socket.io` được proxy sang `http://localhost:3000` — không cần CORS config khi phát triển.


### 8.4 Điểm quan trọng về kết nối frontend ↔ backend ↔ database

**Terminal Panel (trái):**  `stream:start` → Socket.IO → `ingestionService.startStream()` → `Promise.all` parallel write → bảng `transactions`

**Explorer Panel (phải):**
- Search account_id → GET /api/transactions/:id → Partition Key read O(1)
- Filter type = DEPOSIT → GET /api/transactions/by-type/DEPOSIT → Materialized View transactions_by_type
- AccountCard → GET /api/accounts/:id → bảng accounts
- AlertsPanel → GET /api/accounts/:id/alerts → bảng fraud_alerts

### 8.5 Chạy toàn bộ
``` bash
# Terminal 1
cd backend && npm run seed && npm run dev

# Terminal 2
cd frontend && npm run dev
# → http://localhost:5173
```

---

## 9. Luồng dữ liệu end-to-end

### Luồng ghi — Ingestion stream

```
[Nút "Tạo luồng"]
       │
       ▼ socket.emit('stream:start', { batchSize: 50 })
[useSocket.js hook]
       │
       ▼ WebSocket
[socketHandler.js — server]
       │
       ▼ ingestionService.startStream()
       │  ┌─ Loop mỗi 100ms ──────────────────────────┐
       │  │  Tạo 50 GD ngẫu nhiên (faker)             │
       │  │  Promise.all(50 × client.execute(INSERT)) │
       │  │  Đo thời gian → tính TPS                  │
       │  └───────────────────────────────────────────┘
       │
       ▼ socket.emit('stream:tick', { written, tps, items })
[TerminalPanel.jsx]
       │  Thêm log lines vào terminal
       │  Cập nhật throughput counter
```

### Luồng đọc — Query theo account

```
[Nhập ACC000001 → nhấn QUERY]
       │
       ▼ axios.get('/api/transactions/ACC000001?limit=50')
[transactionController.js]
       │
       ▼ transactionService.getByAccount()
       │
       ▼ CQL: SELECT * FROM transactions
       │       WHERE account_id = 'ACC000001'   ← Partition Key
       │       LIMIT 50
       │  Cassandra route đến đúng node chứa ACC000001
       │  Đọc từ MemTable hoặc SSTable trên node đó
       │
       ▼ { transactions: [...50 rows] }
[TransactionTable.jsx — render với slide-in animation]
```

### Luồng đọc — Filter theo type (Materialized View)

```
[Chọn filter "DEPOSIT"]
       │
       ▼ axios.get('/api/transactions/by-type/DEPOSIT?limit=50')
[transactionController.js]
       │
       ▼ transactionService.getByType({ type: 'DEPOSIT' })
       │
       ▼ CQL: SELECT * FROM transactions_by_type
       │       WHERE type = 'DEPOSIT'   ← MV Partition Key
       │       LIMIT 50
       │  Không scan bảng transactions gốc
       │  MV partition 'DEPOSIT' nằm trên 1 node cụ thể
       │
       ▼ { transactions: [...50 rows] }
```

---

## 10. Biến môi trường

### `.env`
```env
CASSANDRA_HOST=localhost
CASSANDRA_PORT=9042
BACKEND_PORT=3000
FRONTEND_PORT=5173
```

### `backend/.env`

```env
# Cassandra
CASSANDRA_HOST=localhost        # "cassandra" khi chạy trong Docker Compose
CASSANDRA_PORT=9042
CASSANDRA_KEYSPACE=ledger       # Phải khớp với keyspace.cql
CASSANDRA_DC=datacenter1        # Phải khớp với CASSANDRA_DC trong docker-compose

# Server
PORT=3000
NODE_ENV=development
```

> ⚠️ **Quan trọng:** `CASSANDRA_DC` phải khớp **chính xác** với tên datacenter trong Cassandra. Kiểm tra bằng: `docker exec cassandra nodetool status`

### `frontend/.env`

```env
VITE_API_URL=http://localhost:3000/api
```

### Kiểm tra kết nối

```bash
# Kiểm tra backend kết nối Cassandra thành công
curl http://localhost:3000/api/health
# Kết quả: { "status": "ok", "ts": "2025-..." }

# Kiểm tra có data chưa
curl http://localhost:3000/api/accounts/ACC000001
```

---

## 11. Câu hỏi thường gặp

**Q: Cassandra khởi động mất bao lâu?**  
A: Khoảng 45–90 giây. Có thể theo dõi bằng `docker compose logs -f cassandra`. Khi thấy `UN` (Up/Normal) trong log là sẵn sàng.

**Q: `cassandra-init` container báo lỗi kết nối?**  
A: Cassandra chưa hoàn toàn sẵn sàng nhận CQL dù đã qua healthcheck. Chạy lại thủ công:
```bash
docker exec -i cassandra cqlsh < database/keyspace.cql
docker exec -i cassandra cqlsh < database/schema.cql
docker exec -i cassandra cqlsh < database/mv_setup.cql
docker exec -i cassandra cqlsh < database/indexes.cql
```

**Q: Backend lỗi `AllNodesFailedToConnect`?**  
A: Kiểm tra `CASSANDRA_DC` trong `.env` có khớp với datacenter thực của Cassandra không:
```bash
docker exec cassandra nodetool status
# Tìm dòng "Datacenter: ..."
```

**Q: Materialized View có cần bật thêm config không?**  
A: Với Cassandra 4.x, MV mặc định được bật. Nếu gặp lỗi, kiểm tra trong `cassandra.yaml`:
```bash
docker exec cassandra grep "materialized_views" /etc/cassandra/cassandra.yaml
```

**Q: Throughput thực tế thấp hơn mong đợi?**  
A: Trên dev machine single-node, throughput thực tế phụ thuộc RAM và CPU cấp cho Docker. Tăng `MAX_HEAP_SIZE` trong `docker-compose.yml` lên `1G` nếu có đủ RAM.

**Q: Làm sao reset toàn bộ data?**  
```bash
docker compose down -v          # Xóa volume Cassandra
docker compose up -d            # Khởi động lại
# Rồi chạy seed lại
```

---

## 12. Khởi động toàn bộ chương trình:

### Bước 1: Khởi động toàn bộ hệ thống
Mở terminal, cd vào thư mục gốc của project (nơi có docker-compose.yml), rồi chạy:
```bash
docker compose up --build
```

Lần đầu sẽ mất 3–5 phút để build image. Sau đó Cassandra cần thêm 60–90 giây để khởi động hoàn toàn. Bạn biết mọi thứ ready khi thấy log:
```
cassandra-init  | Schema init complete.
backend         | [Cassandra] Connected — keyspace: ledger
backend         | [Server] Running on http://localhost:3000
```

**Lưu ý RAM:** Cassandra cần ít nhất 2 GB RAM được cấp cho Docker. Vào Docker Desktop → Settings → Resources → tăng Memory lên ≥ 4 GB nếu máy bạn đang để thấp.

### Bước 2: Seed dữ liệu mẫu
Sau khi backend đã connected, mở một terminal khác và chạy:
```bash
# Seed mặc định: 50 users, 150 accounts, ~30.000 transactions
docker exec backend node src/seed/index.js

# hoặc seed to hơn để demo throughput rõ hơn:
docker exec backend node src/seed/index.js --users=200 --accounts=600 --txns=50000
```

Chờ đến khi thấy ✅ Seed hoàn tất là xong.

### Bước 3 — Mở ứng dụng

Truy cập [http://localhost:5173] trên trình duyệt.
Để test nhanh backend có hoạt động không:

```bash
curl http://localhost:3000/api/health
# → {"status":"ok","ts":"..."}

# Lấy lịch sử giao dịch của account ACC000001
curl http://localhost:3000/api/transactions/ACC000001
```

---

## 13. Chạy toàn bộ chương trình (Quick Start)

Dành cho những ai muốn chạy thử dự án trên máy cá nhân một cách nhanh nhất. (Yêu cầu máy đã cài đặt **Docker** và **Docker Compose**, nên cấp cho Docker tối thiểu 4GB RAM).

**Bước 1: Khởi động hệ thống**
1. Khởi động backend:
```bash
cd backend

npm install

npm run dev
```

2. Khởi động frontend:
```bash
cd frontend

npm install

npm run dev
# Terminal sẽ in: VITE ready at http://localhost:5173
```

3. Mở terminal tại thư mục gốc của dự án và chạy lệnh:
```bash
# cd về thư mục gốc trước đã
docker compose up --build -d
```
*Lưu ý: Lần đầu tiên chạy sẽ mất khoảng 3-5 phút để tải các images và khởi động. Cassandra khởi động khá nặng nên hãy kiên nhẫn chờ đến khi các dịch vụ sẵn sàng.* Các lần sau chỉ cần chạy:

```bash
docker compose up -d
```
Và chờ khoảng 1 phút rồi chạy tiếp bước 2.


**Bước 2: Tạo dữ liệu mẫu (Seed Data)**
Khi hệ thống đã chạy lên (đợi khoảng 1-2 phút sau Bước 1), tiến hành sinh dữ liệu mẫu bằng lệnh:
```bash
docker exec backend node src/seed/index.js
```
*Lệnh này sẽ tự động sinh ra khoảng 40.000 dòng dữ liệu (Users, Accounts, Transactions...) và đẩy thẳng vào CSDL Cassandra.*

**Bước 3: Mở giao diện và trải nghiệm**
- Mở trình duyệt và truy cập: [http://localhost:5173](http://localhost:5173)
- Tại giao diện chính, bạn có thể nhấn nút **"Tạo luồng giao dịch"** (cạnh bảng Terminal) để xem hệ thống thực hiện đẩy liên tục hàng trăm giao dịch real-time mỗi giây.
- Chuyển qua các tab "Tra cứu tài khoản", "Cảnh báo gian lận" để trải nghiệm các truy vấn trực tiếp xuống DB.

**Bước 4: Dọn dẹp (Tùy chọn)**
Khi không muốn chạy nữa và muốn xóa sạch toàn bộ data, bạn dùng lệnh:
```bash
docker compose down -v
```