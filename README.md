## Hướng dẫn setup:

## Hướng dẫn chạy:

## Cấu trúc repo:

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
│   ├── src/
│   │   ├── server.js             # Khởi tạo HTTP server + gắn Socket.io
│   │   ├── config/
│   │   │   └── db.js             # Cassandra Client Singleton (dùng chung)
│   │   ├── routes/
│   │   │   ├── ingestion.js      # 🟡 KHANG: POST /api/transactions/bulk
│   │   │   └── query.js          # 🟠 HIỀN: GET /api/transactions, filter
│   │   ├── controllers/
│   │   │   ├── ingestionController.js
│   │   │   └── queryController.js
│   │   ├── services/
│   │   │   ├── dataGenerator.js  # Faker + mock logic (Khang)
│   │   │   └── throughputTracker.js  # Tính real-time tx/s (Khang)
│   │   ├── ws/
│   │   │   └── socket.js         # 🟠 HIỀN: Socket.io server, broadcast batch
│   │   └── utils/
│   │       └── response.js       # Chuẩn hóa JSON response & error handling
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