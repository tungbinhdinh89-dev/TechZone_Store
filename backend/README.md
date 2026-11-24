# Backend — Computer Store

PHP 8.3 thuần/OOP, MVC và PDO MySQL theo [rules](../rules.md) và [spec](../spec.md). Không framework/ORM. Backend phục vụ React qua JSON theo quyết định chuyển tiếp DB-03; catalog PHP server-rendered tiếp tục hoạt động. Xem [schema và ownership](database/README.md).

## Kết nối NAS

Container `mysql_nas` tại **192.168.1.200:32771**, map vào 3306 trong container. Server hiện tại là MySQL **26.7.0** theo DB-02; cấu trúc SQL giữ baseline MySQL/InnoDB/utf8mb4/PDO.

```text
mysql:host=192.168.1.200;port=32771;dbname=computer_store;charset=utf8mb4
```

Truyền username/password riêng qua `DB_USERNAME`/`DB_PASSWORD` trong `backend/.env`. Không đặt credentials trong DSN, source hoặc frontend. PC không cần chạy container MySQL khác khi dùng NAS.

## Cài và chạy

Từ root trên Windows:

```powershell
npm run backend:setup
# Sao chép .env.example sang .env nếu chưa có; điền cấu hình riêng.
npm run backend:connection
npm run backend:init
npm run backend:migrate
npm run backend:create-admin
npm run backend:seed-store
npm run backend:doctor
npm run dev:backend
```

`backend:setup` tải PHP 8.3 NTS x64, Composer 2 và CA bundle vào `.tools/`, kiểm checksum; không sửa PATH/registry hay tạo Windows service. Cần Microsoft Visual C++ 2015–2022 x64 runtime. Máy hiện tại dùng PHP **8.3.36**. Scripts tự chọn PHP portable; đặt `PHP_BINARY` nếu cần dùng bản khác.

Máy đã có PHP: cần **fileinfo, mbstring, PDO/PDO MySQL**, chạy `composer install --working-dir=backend`. Composer chỉ cung cấp PSR-4 autoload. Có thể dùng `php backend/console.php migrate` và các command trong console trực tiếp. Biến shell ưu tiên hơn `.env`; loader hỗ trợ KEY=value, quote, comment nguyên dòng, không interpolation.

`backend:init` tạo DB ứng dụng và DB test nếu chưa có; không drop/truncate hoặc ghi đè `.env`. `backend:connection` chỉ đọc kết nối/version/bảng, không xuất credentials. `backend:migrate` áp dụng bảy migration có checksum; không sửa SQL đã áp dụng.

`backend:seed-store` nạp nội dung công khai từ JSON một lần bằng transaction và ledger `data_seeds`; không ghi đè chỉnh sửa sau đó. Seed không tạo tài khoản/đơn hàng. Seed cũ `backend:seed` chỉ thêm ba sản phẩm demo, không cần chạy cho UI mới.

Bộ seed hiện có **100 sản phẩm / 11 danh mục, 5 bài viết và 5 FAQ**, dùng ảnh nội bộ có sẵn. Chạy `npm run backend:seed-store` sau khi migrate và tạo Admin. Ledger `store-content-100-v2` cho phép nâng cấp bộ seed cũ (12 sản phẩm/3 bài viết), giữ SKU/slug cũ, không ghi đè chỉnh sửa và không thêm FAQ trùng câu hỏi. Có khóa chống chạy seed đồng thời. Sản phẩm có nhiều mức giá/tồn kho, gồm hết hàng và sắp hết hàng để thử UI; giá, cấu hình và ảnh minh họa là dữ liệu demo, cần cập nhật trước khi bán thật. Seed không xóa dữ liệu người dùng tự tạo, nên DB đang có dữ liệu riêng có thể có tổng số lớn hơn bộ seed.

Tạo admin bằng `BOOTSTRAP_ADMIN_EMAIL` và `BOOTSTRAP_ADMIN_PASSWORD` (16–72 byte) trong `.env`/shell rồi chạy `backend:create-admin`. Không có HTTP endpoint đăng ký Admin. Lệnh không đổi mật khẩu admin đã tồn tại. Credentials admin đã tạo tại máy này ở file private `.tools/admin-credentials.json` trong root.

## Frontend và HTTP

### Portal quản trị sản phẩm

Mở `http://localhost:8443/#/admin` bằng tài khoản Admin. Dashboard dùng số liệu thật; sidebar có Sản phẩm và Danh mục. React được giữ theo DB-03; đây chưa phải bản chuyển toàn bộ portal sang PHP Views. Thành phần bảng lấy từ TailAdmin Free (MIT), revision và license lưu tại `frontend/src/tailadmin/`.

Sản phẩm hỗ trợ tìm tên/SKU/thương hiệu, lọc danh mục/trạng thái, phân trang SQL; thêm/sửa mô tả, SKU/slug duy nhất, giá không âm, tồn kho nguyên không âm, nổi bật, trạng thái bán/ẩn/ngừng bán. Upload tối đa 12 ảnh nội bộ, chọn ảnh chính và bỏ ảnh khỏi gallery. Xóa sản phẩm là ngừng bán để giữ lịch sử đơn; chọn bộ lọc Ngừng bán để sửa/khôi phục. File upload đã bỏ khỏi gallery được giữ trong thư viện media.

Danh mục hỗ trợ tìm kiếm/phân trang/thêm/sửa/ẩn/xóa. Không xóa danh mục đang chứa sản phẩm hoặc danh mục con (409); quan hệ cha/con hiện có được giữ, chưa có UI thay đổi phân cấp. API `list/categories`, `admin-category-save`, `admin-category-delete` bắt buộc Admin; các mutation vẫn dùng CSRF. Không cần migration mới.

Smoke test riêng: `.tools/php/php.exe backend/tests/catalog-cms.php` (hoặc `php` 8.3 tương ứng). Chỉ chạy trên DB `_test`, tự dọn fixtures. Bao phủ CRUD, trùng SKU/slug, gallery, ẩn sản phẩm và chặn xóa danh mục đang dùng. Ngày 24/11/2026 smoke test đã pass trên MySQL Docker 8.4.13 / computer_store_test; build/typecheck/PHP lint/unit pass.

Hai terminal chạy `npm run dev:backend` và `npm run dev`. UI **http://localhost:8443/** dùng Fetch cùng origin; Vite proxy tới PHP **127.0.0.1:8000**. Đổi `BACKEND_PORT` và `BACKEND_URL` tương ứng ở hai terminal nếu cần.

| Route | Chức năng |
| --- | --- |
| `GET /api/health` | Trạng thái database/schema, không lộ SQL/credentials |
| `GET /api/store` | Bootstrap công khai + dữ liệu theo session; chỉ user hiện tại, giỏ/yêu thích/đơn đúng quyền |
| `GET /api/store/list/{resource}` | Search/filter, SQL LIMIT/OFFSET; `{items,pagination}` |
| `GET /api/store/item/{resource}/{id}` | Chi tiết products/articles/orders, kiểm trạng thái và ownership |
| `POST /api/store/{action}` | Form JSON, CSRF và PHP Session; kiểm quyền tại server |
| `POST /api/store/admin-upload` | Multipart trường image, Admin + CSRF; trả local path |
| `GET /products`, `/products/{slug}` | Catalog PHP Views hoạt động khi tắt JS |
| `GET /api/products` | Progressive search cho catalog SSR |

Resources: products, articles, comments, contacts, faqs, users, orders, company, services, pricing, settings, media. `admin=1` luôn yêu cầu Admin. Contacts/users chỉ Admin; orders theo user; bình luận public gắn với bài đã xuất bản và đã duyệt.

Actions: login/register/logout/profile, cart-add/cart-quantity/favorite/checkout/comment/contact/newsletter; admin-product-save/delete, admin-user-toggle, admin-order-status, admin-shipping, admin-content-save/delete. Response `{success,data,message,errors}`, giá DECIMAL là string. POST JSON gửi `X-CSRF-Token` từ snapshot; token đổi sau login/logout. Upload dùng FormData và cùng header. Không mở CORS.

Cookie HttpOnly/SameSite Lax, đổi session ID khi login/logout; file session ở `backend/.cache/sessions/` được ignore. Password dùng password_hash/password_verify và allowlist DTO, không xuất hash. Có giới hạn thử đăng nhập theo IP/email. Frontend chỉ cache RAM, lỗi backend không fallback mock.

### TZ-25 / TZ-27 — mật khẩu trên UI React hiện có

- `POST /api/store/password-change`: `currentPassword`, `password`, `passwordConfirmation`; chỉ đổi tài khoản của session, xác minh mật khẩu cũ.
- `POST /api/store/admin-password-reset`: `id`, `password`, `passwordConfirmation`; chỉ Admin đặt mật khẩu mới cho Member đang active. Admin nhập và xác nhận mật khẩu mới trong quản lý thành viên; không đọc mật khẩu gốc, không gửi email tự động.
- Cả hai yêu cầu CSRF, mật khẩu mới 8–72 byte; không trả password/hash. Thay đổi dùng điều kiện hash cũ để tránh ghi đè khi có request đồng thời.
- Session ghi fingerprint của hash tại login; mỗi request kiểm với DB. Đổi/reset mật khẩu vô hiệu hóa các phiên cũ vào request tiếp theo. Tự đổi giữ phiên hiện tại và xoay session ID/CSRF. Phiên có trước bản cập nhật cần đăng nhập lại; không cần migration SQL.
- FE: Tài khoản → Thông tin cá nhân → Đổi mật khẩu; Admin → Tài khoản → Đặt lại mật khẩu. PHP Views tương ứng chưa nằm trong phạm vi tích hợp React này; ticket chưa được đánh dấu Done/đóng tự động.

## Ranh giới nghiệp vụ

`Application.php` wiring thủ công một PDO cho các module. `StoreController` parse request, gọi Service, trả Response; SQL trong Repository. Catalog sở hữu giá/tồn kho; Sales gọi CatalogService trong cùng transaction. Identity sở hữu user/session; Editorial lấy tên tác giả qua UserService. Guest cart theo PHP Session, Member cart/yêu thích theo MySQL.

Checkout tính tiền bằng integer minor units, đọc lại giá và khóa inventory theo ID, lưu snapshot tên/SKU/giá/ảnh, trừ kho và xóa giỏ cùng transaction. Client total chỉ để phát hiện thay đổi; không được tin làm giá. Hủy chỉ Admin từ pending/confirmed, khóa order và hoàn kho một lần. `completed/cancelled` là trạng thái cuối.

Upload kiểm Fileinfo, kích thước ảnh, giới hạn 5 MB và tên random; chỉ JPG/PNG/WebP. `uploads/.htaccess` chặn script; dev router chỉ phục vụ định dạng ảnh cho phép. Metadata media lưu MySQL, file ảnh ở server. Dịch vụ/bảng giá dùng chung bảng services và cùng vòng đời dữ liệu.

## Triển khai

DocumentRoot PHP **backend/public/**; không public `.env`, app, vendor hoặc config. Apache/mod_rewrite cần AllowOverride All/Options -Indexes. `dev:backend` copy `frontend/public/` sang `backend/public/assets/`; chạy lại sau khi sửa static assets. Production React cần build và reverse proxy cùng origin tới PHP, hoặc web server phục vụ UI từ dist và PHP từ webroot riêng. Catalog SSR chạy không cần React build.

NTS portable dành cho CLI dev server. PHP template ở `frontend/resources/views/`; View escape dữ liệu, không gọi SQL. HTTPS production cần cookie Secure; dev server không phải server production.

## Kiểm thử và giới hạn

```powershell
npm run backend:lint
npm run backend:test
npm run backend:test-db
npm run backend:test-http
```

Unit tests độc lập DB. Database tests kiểm constraint/seed/snapshot và rollback. HTTP tests dùng PHP cổng tạm và `computer_store_test`, kiểm session/CSRF, quyền, CMS, upload, checkout rollback/ownership và concurrency checkout/cancel. Fixtures có prefix ngẫu nhiên và dọn sau test; runner từ chối DB không có đuôi `_test`. Chưa xác nhận trên instance MySQL 8 riêng; môi trường kiểm thực tế là NAS 26.7.0.

Đã kết nối các luồng đang có trên React với MySQL, bổ sung đổi/reset mật khẩu. Chưa hoàn tất toàn bộ P0: chuyển UI sang PHP Views/TailAdmin, quản trị danh mục chuyên biệt, avatar, SEO toàn site, W3C và kiểm thử trình duyệt cần triển khai/nghiệm thu tiếp. Chưa tích hợp email, thanh toán online hoặc giao hàng bên thứ ba.
