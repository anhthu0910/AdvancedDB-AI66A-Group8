# 📘 Hướng Dẫn Toàn Tập Về Apache Cassandra Cho Người Mới Bắt Đầu

> **Cập nhật:** Tháng 04/2026 | Phiên bản ổn định hiện tại: `Cassandra 5.x`

---

## 1. Apache Cassandra là gì?
- **Định nghĩa:** Apache Cassandra là hệ quản trị cơ sở dữ liệu NoSQL **phân tán**, mã nguồn mở, thuộc nhóm **Wide-Column Store**.
- **Nguồn gốc:** Phát triển nội bộ tại Facebook (2008) để xử lý inbox, sau đó open-source và trở thành dự án Apache (2010).
- **Mục tiêu thiết kế:** 
  - Xử lý khối lượng dữ liệu khổng lồ (hàng petabyte).
  - Ưu tiên **ghi cực nhanh** và **độ sẵn sàng cao** (High Availability).
  - Không có điểm thất bại đơn lẻ (No Single Point of Failure).
  - Mở rộng tuyến tính bằng cách thêm node phần cứng thông thường.

---

## 2. 🔑 Đặc điểm nổi bật

| Tính năng | Giải thích ngắn gọn |
|-----------|---------------------|
| **Peer-to-Peer (Ngang hàng)** | Không có node Master/Slave. Mọi node đều bình đẳng, tự quản lý và cân bằng tải. |
| **Mở rộng tuyến tính** | Thêm 1 node → dung lượng & throughput tăng gần như tỷ lệ thuận. |
| **Tunable Consistency** | Bạn chọn độ nhất quán (`Consistency Level`) cho từng truy vấn: `ONE`, `QUORUM`, `LOCAL_QUORUM`, `ALL`... |
| **Đa trung tâm dữ liệu (Multi-DC)** | Hỗ trợ replication xuyên datacenter, phù hợp hệ thống global. |
| **CQL (Cassandra Query Language)** | Cú pháp giống SQL, dễ tiếp cận, nhưng hoạt động trên mô hình phi quan hệ. |
| **Chịu lỗi cao** | Dữ liệu tự động nhân bản. Mất node, cluster vẫn hoạt động và tự phục hồi khi node quay lại. |

---

## 3. 🏗️ Kiến trúc & Khái niệm cốt lõi

### 3.1 Cấu trúc phân cấp

```
Cluster (Tập hợp các node)
└─ Keyspace (Tương tự Database)
└─ Table (Column Family)
└─ Partition (Tập hợp row có cùng Partition Key)
└─ Row (Được sắp xếp theo Clustering Key)
└─ Column (Key-Value, hỗ trợ sparse data)
```


### 3.2 Ring & Token
- Cassandra dùng cơ chế **vòng tròn ảo (Ring)** để phân phối dữ liệu.
- Mỗi node chịu trách nhiệm một dải `token`. Khi dữ liệu được ghi, `Partition Key` sẽ được băm (hash) → ánh xạ đến token → xác định node lưu trữ.

### 3.3 Các thành phần quan trọng
| Thành phần | Vai trò |
|------------|---------|
| **Partitioner** | Hàm băm mặc định: `Murmur3Partitioner`. Quyết định dữ liệu nằm ở đâu. |
| **Replication Strategy** | Quy định số bản sao & vị trí lưu: `SimpleStrategy` (1 DC), `NetworkTopologyStrategy` (nhiều DC/rack). |
| **Gossip Protocol** | Cơ chế peer-to-peer giúp node tự trao đổi trạng thái (sống/chết, tải, token...) mỗi giây. |
| **Snitch** | Xác định topology mạng (rack, datacenter) để tối ưu routing & replication. |
| **Consistency Level (CL)** | Số replica phải phản hồi để truy vấn thành công. Ví dụ: `CL=QUORUM` → cần >50% replica đồng ý. |

---

## 4. 📊 Mô hình dữ liệu & Ngôn ngữ CQL

### 4.1 Primary Key trong Cassandra
```cql
PRIMARY KEY ((partition_key), clustering_key_1, clustering_key_2)
```
Partition Key: Quyết định dữ liệu nằm trên node nào. Các row cùng partition key sẽ nằm cùng vật lý.
Clustering Key: Sắp xếp dữ liệu bên trong một partition. Hỗ trợ truy vấn range (>, <, BETWEEN).
⚠️ Lưu ý vàng: Cassandra không hỗ trợ JOIN, không hỗ trợ transaction đa bảng (chỉ hỗ trợ lightweight transaction đơn giản với IF NOT EXISTS/IF condition), và WHERE clause bị giới hạn. Bạn phải thiết kế table theo truy vấn, không phải theo chuẩn hóa.

### 4.2 Kiểu dữ liệu phổ biến
text, varchar, int, float, boolean, timestamp, uuid, blob, decimal, inet, list, set, map

```
-- Tạo Keyspace (1 bản sao, chiến lược đơn giản)
CREATE KEYSPACE demo WITH REPLICATION = {
  'class': 'SimpleStrategy',
  'replication_factor': 1
};

USE demo;

-- Tạo table (partition: user_id, clustering: created_at)
CREATE TABLE user_logs (
  user_id uuid,
  created_at timestamp,
  action text,
  details text,
  PRIMARY KEY ((user_id), created_at)
) WITH CLUSTERING ORDER BY (created_at DESC);

-- Insert
INSERT INTO user_logs (user_id, created_at, action, details) 
VALUES (uuid(), toTimestamp(now()), 'LOGIN', 'Mobile App');

-- Select (PHẢI có partition key trong WHERE)
SELECT * FROM user_logs WHERE user_id = <uuid>;
SELECT * FROM user_logs WHERE user_id = <uuid> AND created_at > '2025-01-01';
```