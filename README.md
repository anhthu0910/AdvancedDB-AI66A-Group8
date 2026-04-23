## Hướng dẫn setup:

### Yêu cầu hệ thống
- Docker & Docker Compose
- Node.js >= 18.x (nếu chạy local không dùng Docker)
- npm hoặc yarn

### Các bước cài đặt

#### 1. Clone repository và di chuyển vào thư mục dự án
```bash
git clone <repository-url>
cd financial-ledger-cassandra
```

#### 2. Tạo file biến môi trường
Tạo file `.env` trong thư mục gốc với các biến sau:
```env
CASSANDRA_HOST=localhost
CASSANDRA_PORT=9042
BACKEND_PORT=3000
FRONTEND_PORT=5173
```

#### 3. Cài đặt dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

#### 4. Cài đặt Cassandra

**Dùng Docker (khuyến nghị)**
```bash
# Từ thư mục gốc
docker compose up -d cassandra
```


#### 5. Khởi tạo database
```bash
# Kết nối vào Cassandra và chạy các script theo thứ tự:
cqlsh -f database/keyspace.cql
cqlsh -f database/init.cql
cqlsh -f database/ttl_config.cql
cqlsh -f database/mv_setup.cql
```

## Hướng dẫn chạy:

### Cách 1: Chạy toàn bộ bằng Docker (khuyến nghị)
```bash
# Từ thư mục gốc, dựng tất cả services (Cassandra + Backend + Frontend)
docker-compose up -d

# Xem logs để kiểm tra
docker-compose logs -f
```

Truy cập ứng dụng tại:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000

### Cách 2: Chạy local (thủ công)

#### 1. Khởi động Cassandra
```bash
# Nếu dùng Docker chỉ cho Cassandra
docker-compose up -d cassandra
```

#### 2. Khởi tạo database (nếu chưa làm ở bước setup)
```bash
cqlsh -f database/keyspace.cql
cqlsh -f database/init.cql
cqlsh -f database/ttl_config.cql
cqlsh -f database/mv_setup.cql
```

#### 3. Chạy Backend
```bash
cd backend
npm start
# Server sẽ chạy tại http://localhost:3000
```

#### 4. Chạy Frontend (ở terminal mới)
```bash
cd frontend
npm run dev
# Frontend sẽ chạy tại http://localhost:5173
```

### Kiểm tra và test hệ thống

#### 1. Test API ingestion (ghi giao dịch)
```bash
# Gửi request POST để thêm giao dịch mẫu
curl -X POST http://localhost:3000/api/transactions/bulk \
  -H "Content-Type: application/json" \
  -d '{"account_id": "ACC001", "amount": 1000000, "type": "deposit"}'
```

#### 2. Test API query (đọc giao dịch)
```bash
# Truy vấn lịch sử giao dịch theo account_id
curl http://localhost:3000/api/transactions?account_id=ACC001
```

#### 3. Chạy load test (tùy chọn)
```bash
cd load-test/k6
k6 run bulk_insert.js
```

#### 4. Xem kết quả benchmark
- Kết quả load test được lưu tại `load-test/results/`
- Xem chi tiết tại `docs/benchmark-results.md`

### Lưu ý
- Đảm bảo Cassandra đã khởi động hoàn toàn trước khi chạy backend
- File `.env` cần được cấu hình đúng trước khi chạy
- Materialized View cho thống kê loại giao dịch được tạo tự động sau khi chạy `mv_setup.cql`
- TTL 1 năm được áp dụng tự động cho các giao dịch cũ

## Cấu trúc repo:
```
financial-ledger-cassandra/
├── README.md                     # Hướng dẫn setup, chạy, cấu trúc repo
├── .gitignore                    # Bỏ qua node_modules, .env, build/, .DS_Store
├── .env                          # Biến môi trường (tự tạo vì đã gitignore)
├── docker-compose.yml            # Dựng Cassandra + Backend + Frontend (1 lệnh)
│
├── database/                     # 🟢 LÂN (DB Architect)
│   ├── keyspace.cql              # CREATE KEYSPACE IF NOT EXISTS ...
│   ├── init.cql                  # Bảng chính + Partition/Clustering Key
│   ├── ttl_config.cql            # Cấu hình TTL 1 năm (USING TTL hoặc trigger)
│   ├── mv_setup.cql              # Materialized View cho thống kê loại giao dịch
│   └── seeds/                    # Dữ liệu mẫu (nếu cần test nhanh)
│       └── mock_accounts.cql
│
├── backend/                      # 🟡 KHANG + 🟠 HIỀN (Chung 1 Express App)
│   ├── package.json
|   ├── server.js             # Khởi tạo HTTP server + gắn Socket.io
|   ├── index.js              
│   ├── src/
│   │   ├── query/                      # 🟠 Hiền 
│   │   │   ├── queryController.js      # 
│   │   │   ├── query.js                # GET /api/transactions, filter
│   │   │   ├── socket.js               # Socket.io server, broadcast batch
│   │   │   └── throughputTracker.js    # GET /api/transactions, filter
│   │   ├── ingestion/                  🟡 KHANG:
│   │   │   ├── dataGenerator.js        # Faker + mock logic 
│   │   │   ├── ingestionController.js
│   │   │   ├── ingestion.js            # POST /api/transactions/bulk
│   │   │   └── throughputTracker.js    # Tính real-time tx/s 
│   │   ├── shared
│   │   │   ├── config/
│   │   │   |   └── db.js             # Cassandra Client Singleton (dùng chung)
│   │   │   └── utils/
│   │   │       └── response.js       # Chuẩn hóa JSON response & error handling
│   └── docs/
│       └── openapi.yaml          # Swagger contract (🟠 Hiền chủ trì)
│
├── frontend/                     # 🔵 THƯ (Frontend UX/UI)
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── components/
│       │   ├── TerminalLog.jsx       # Panel trái: log chạy real-time
│       │   ├── ThroughputChart.jsx   # Biểu đồ throughput (Recharts)
│       │   ├── SearchBar.jsx         # Ô nhập account_id + bộ lọc
│       │   └── StatementTable.jsx    # Panel phải: bảng sao kê (react-window)
│       ├── hooks/
│       │   └── useTransactionStream.js  # 🔵 THƯ + 🟠 HIỀN: WS client + buffer
│       ├── api/
│       │   └── client.js             # Axios config, gọi REST API
│       ├── styles/
│       │   └── globals.css           # Tailwind / CSS custom
│       └── assets/
│
├── load-test/                    # 🟡 KHANG (Lead) + Cả nhóm
│   ├── k6/
│   │   ├── bulk_insert.js        # Script bắn POST /api/transactions/bulk
│   │   └── config.js             # VU, duration, thresholds
│   └── results/                  # JSON/CSV output từ k6, screenshot
│
└── docs/                         # 🔵 THƯ (Tổng hợp) + Cả nhóm
    ├── architecture.md           # Sơ đồ luồng dữ liệu, tech stack
    ├── data-modeling.md          # Giải thích Partition/Clustering, TTL, MV
    └── benchmark-results.md      # k6 output, EXPLAIN/TRACING logs
```