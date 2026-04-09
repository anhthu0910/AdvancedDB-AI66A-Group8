# Đề tài 6: Hệ thống Lưu trữ Nhật ký Giao dịch Tài chính (Financial Transaction Ledger) 

Column-Family (Cassandra) — Ghi tốc độ cao & Phân tán
---
#### Tính năng cần có: 
Thiết kế schema tối ưu để ghi nhận mọi giao dịch (nạp/rút/chuyển tiền) theo Partition Key là account_id và Clustering Key là transaction_time DESC. Xây dựng API lấy lịch sử giao dịch theo tài khoản, lọc theo loại giao dịch và khoảng thời gian, đảm bảo ghi được hàng nghìn giao dịch mỗi giây. 

#### Giao diện tham khảo: 
Màn hình "Transaction Explorer": Nửa trái mô phỏng terminal giao dịch ngân hàng — nút [Tạo luồng giao dịch ngẫu nhiên] đổ liên tục các dòng log giao dịch vào màn hình với tốc độ ~500 tx/giây, hiển thị throughput thực tế. Nửa phải là ô tìm kiếm theo account_id — truy vấn tức thì trả về sao kê đầy đủ, chứng minh việc gom cụm theo Partition Key giúp đọc cực nhanh dù lượng ghi rất lớn. 

#### Tính năng nâng cao: 
Thiết lập TTL tự động xóa log giao dịch cũ hơn 1 năm. Tạo Materialized View để hỗ trợ truy vấn tổng hợp theo loại giao dịch mà không cần scan toàn bảng. 