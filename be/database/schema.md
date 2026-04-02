# 🧸 Simple POS Database (Family Version)

## 📌 Mục tiêu hệ thống

* Dùng cho cửa hàng gia đình
* Quét barcode để thanh toán nhanh
* Thiết kế đơn giản, dễ hiểu
* Chưa quản lý kho
* Có thể mở rộng trong tương lai mà không cần sửa database

---

# 🧱 Database Tables

---

## 1️⃣ Table: `products`

Lưu thông tin sản phẩm (đồ chơi).

> Quy ước: **1 barcode = 1 sản phẩm**

| Column     | Type          | Constraint         | Description        |
| ---------- | ------------- | ------------------ | ------------------ |
| id         | BIGINT        | PK, AUTO_INCREMENT | ID sản phẩm        |
| name       | VARCHAR(255)  | NOT NULL           | Tên sản phẩm       |
| barcode    | VARCHAR(100)  | UNIQUE, NOT NULL   | Mã barcode         |
| price      | INT           | NOT NULL           | Giá bán            |
| status     | VARCHAR(20)   | DEFAULT 'ACTIVE'   | Trạng thái         |
| is_auto_created | BOOLEAN   | DEFAULT FALSE      | Tạo tự động (scan/import) |
| created_at | TIMESTAMP     |                    | Thời gian tạo      |
| updated_at | TIMESTAMP     |                    | Thời gian cập nhật |

### SQL

```sql
CREATE TABLE products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    barcode VARCHAR(100) UNIQUE NOT NULL,
    price INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    is_auto_created BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Migration (nếu table đã tồn tại)

```sql
ALTER TABLE products
    ADD COLUMN is_auto_created BOOLEAN DEFAULT FALSE;
```

---

## 2️⃣ Table: `orders`

Mỗi lần thanh toán là một hóa đơn.

| Column         | Type          | Constraint         | Description                |
| -------------- | ------------- | ------------------ | -------------------------- |
| id             | BIGINT        | PK, AUTO_INCREMENT | ID hóa đơn                 |
| total_amount   | INTERGER      |                    | Tổng tiền                  |
| payment_method | VARCHAR(20)   |                    | CASH / QR / CARD           |
| status         | VARCHAR(20)   |                    | PENDING / PAID / CANCELLED |
| created_at     | TIMESTAMP     |                    | Thời gian tạo              |

### SQL

```sql
CREATE TABLE orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    total_amount INTERGER,
    payment_method VARCHAR(20),
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3️⃣ Table: `order_items`

Danh sách sản phẩm trong mỗi hóa đơn.

| Column     | Type          | Constraint         | Description           |
| ---------- | ------------- | ------------------ | --------------------- |
| id         | BIGINT        | PK, AUTO_INCREMENT | ID                    |
| order_id   | BIGINT        | FK                 | Hóa đơn               |
| product_id | BIGINT        | FK                 | Sản phẩm              |
| price      | INTERGER      | NOT NULL           | Giá tại thời điểm bán |
| quantity   | INT           | NOT NULL           | Số lượng              |
| subtotal   | INTERGER      | NOT NULL           | Thành tiền            |

### SQL

```sql
CREATE TABLE order_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    price INTERGER NOT NULL,
    quantity INT NOT NULL,
    subtotal INTERGER NOT NULL,
    CONSTRAINT fk_order
        FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_product
        FOREIGN KEY (product_id) REFERENCES products(id)
);
```
