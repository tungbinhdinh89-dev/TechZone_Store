# TechZone / Computer Store

Website bán máy tính và linh kiện. React hiện lấy dữ liệu từ backend PHP 8.3/PDO và MySQL trên NAS. Quyết định chuyển tiếp DB-03 trong [rules.md](rules.md) và [spec.md](spec.md) cho phép giữ UI này khi tiếp tục xây dựng bản PHP Views theo kiến trúc mục tiêu.

## Chạy dự án

Bộ script trong thư mục scripts/ dùng chung cho Windows PowerShell và macOS/Linux Bash (cần Node.js, dependencies đã cài và PHP 8.3 cho backend):

| Chức năng | PowerShell | macOS/Linux |
| --- | --- | --- |
| Chạy cả frontend + backend | `./scripts/run.ps1` | `bash ./scripts/run.sh` |
| Chỉ frontend | `./scripts/run.ps1 --frontend` | `bash ./scripts/run.sh --frontend` |
| Chỉ backend | `./scripts/run.ps1 --backend` | `bash ./scripts/run.sh --backend` |
| Tạo migration SQL | `./scripts/add.ps1 add_user_field` | `bash ./scripts/add.sh add_user_field` |
| Apply migration pending | `./scripts/update.ps1` | `bash ./scripts/update.sh` |
| Kiểm kết nối và migration | `./scripts/check.ps1` | `bash ./scripts/check.sh` |

Các script chạy được từ bất kỳ thư mục làm việc nào. `Ctrl+C` dừng các server do lần chạy đó tạo. Frontend dùng lại Vite cùng dự án nếu đã chạy. `PORT` đổi cổng FE; `BACKEND_PORT` đổi cổng PHP và proxy khi chạy qua `run`. `PHP_BINARY` chọn PHP. PowerShell bị chặn execution policy: dùng `powershell -ExecutionPolicy Bypass -File ./scripts/run.ps1` (tương tự cho các file khác).

`add` chỉ tạo file đánh số tiếp theo trong `backend/database/migrations/`, không cần kết nối DB. Điền SQL vào file trước khi chạy `update`. `update` dùng `backend/.env`, chỉ apply migration chưa chạy, không reset DB hoặc seed dữ liệu. Database phải tồn tại (máy mới chạy `npm run backend:init` trước). Không sửa migration đã apply.

`check` chỉ đọc: báo `CONNECTED`, liệt kê `APPLIED` kèm thời điểm, `PENDING (not applied)`, `CHANGED` nếu checksum sai và `MISSING FILE` nếu thiếu file đã apply. Exit code 0 khi kết nối và checksum hợp lệ (có pending vẫn là 0); lỗi kết nối/toolchain/integrity trả 1. Chưa có bảng lịch sử thì tất cả migration là pending.

Từ root, dùng Node.js 22.12+ trong dòng Node 22 và pnpm theo `.mise.toml`:

```sh
pnpm install --frozen-lockfile
npm run dev:backend
```

Mở terminal thứ hai:

```sh
npm run dev
```

Truy cập **http://localhost:8443/**; trang quản trị tại **http://localhost:8443/#/admin**. Frontend proxy `/api`, `/uploads`, `/products` và `/assets` tới PHP tại `127.0.0.1:8000`. Cả PHP và MySQL phải hoạt động; UI báo lỗi kết nối và cho thử lại nếu backend chưa sẵn sàng.

`npm run dev` dùng lại Vite của cùng dự án nếu đã chạy. Đổi cổng bằng `npm run dev -- --port 8444` hoặc `PORT`. Dừng server bằng `Ctrl+C` trong terminal tương ứng. `npm run build` xuất `frontend/dist/`; bản build cần được phục vụ cùng origin với PHP hoặc reverse proxy các đường dẫn trên. Deploy riêng dist không cung cấp backend API.

## Khởi tạo backend trên máy mới

### MySQL trên Docker Desktop

Mở Docker Desktop (Linux containers). Sửa cấu hình local trong `backend/.env`, giữ mật khẩu riêng của bạn:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=13306
DB_DATABASE=computer_store
DB_TEST_DATABASE=computer_store_test
DB_USERNAME=root
DB_PASSWORD=your_local_password
```

Chạy từ root (PowerShell, macOS và Linux dùng cùng lệnh Docker):

```sh
docker compose up -d --wait
npm run backend:init
```

Sau đó `./scripts/update.ps1` (Bash: `bash ./scripts/update.sh`) để apply schema và `./scripts/check.ps1` để kiểm tra. Container dùng MySQL 8.4, tạo `computer_store` lần đầu; `backend:init` tạo thêm DB test riêng. Không tự seed hoặc tạo tài khoản. Backend chạy trên host kết nối `127.0.0.1:13306`, không dùng địa chỉ NAS. Compose tự đọc mật khẩu từ `backend/.env`. Nếu port bị chiếm, thêm `MYSQL_PORT=13307` vào `backend/.env`, đổi `DB_PORT=13307` và chạy `docker compose --env-file backend/.env up -d --wait` để áp dụng port tùy chỉnh.

Xem trạng thái: `docker compose ps`. Dừng: `docker compose down`. Dữ liệu nằm trong named volume `mysql_data` và vẫn giữ sau khi dừng container. Các biến khởi tạo MySQL chỉ có tác dụng với volume mới; sửa `DB_PASSWORD` không tự đổi mật khẩu của database đã khởi tạo. MySQL chỉ mở port trên loopback của máy local; mật khẩu không nằm trong compose/source.

Xem [backend/README.md](backend/README.md) cho cấu hình đầy đủ. Trên Windows:

```sh
npm run backend:setup
# Sao chép backend/.env.example thành backend/.env rồi điền credentials riêng.
npm run backend:connection
npm run backend:init
npm run backend:migrate
npm run backend:create-admin
npm run backend:seed-store
npm run backend:doctor
```

`backend:create-admin` đọc `BOOTSTRAP_ADMIN_EMAIL` và `BOOTSTRAP_ADMIN_PASSWORD` trong môi trường local; mật khẩu phải có 16–72 byte. Lệnh chỉ tạo admin nếu chưa có, không đổi mật khẩu tài khoản đã tồn tại. Không có tài khoản demo hay mật khẩu mặc định. Member đăng ký qua UI và được gán quyền tại server.

Máy hiện tại có PHP **8.3.36** trong `.tools/` và MySQL **26.7.0** trên NAS **192.168.1.200:32771**, database `computer_store`. Credentials DB ở `backend/.env` được ignore. Thông tin admin đã tạo cho máy này ở `.tools/admin-credentials.json`, cũng được ignore; không đưa file này vào Git hoặc bản deploy.

## Dữ liệu và chức năng

- Sản phẩm, danh mục, thương hiệu, giá, tồn kho, search/filter/pagination lấy từ MySQL.
- Đăng ký/đăng nhập, hồ sơ, khóa tài khoản và quyền quản trị do PHP Session/RBAC xử lý; thao tác ghi kiểm CSRF.
- Giỏ Member và yêu thích lưu MySQL; giỏ/yêu thích Guest theo PHP Session. Giỏ Guest được gộp khi đăng nhập.
- Checkout COD tính lại giá, coupon, phí giao hàng tại server; transaction khóa tồn kho, lưu snapshot đơn và xóa giỏ. Admin chuyển trạng thái/hủy từ pending/confirmed, hoàn kho một lần. Member chỉ xem đơn của mình.
- Tin tức, bình luận kiểm duyệt, FAQ, công ty, dịch vụ/bảng giá, cài đặt, media, liên hệ và email nhận tin lưu qua backend. Dashboard tổng hợp từ MySQL.
- Upload JPG/PNG/WebP tối đa 5 MB lên server, kiểm MIME/kích thước/tên file; không dùng URL ảnh ngoài thay upload.

`frontend/src/data.ts` chỉ chứa types, nhãn và trạng thái rỗng. `frontend/src/service.ts` dùng Fetch, giữ cache RAM và tải lại sau thao tác ghi; không đọc/ghi localStorage, không sinh dữ liệu khi backend lỗi. Dữ liệu localStorage của prototype cũ không được nhập vào MySQL.

Nội dung công khai ban đầu chuyển sang `backend/database/seeders/store-content.json`, nạp **một lần** bằng `backend:seed-store`; không có tài khoản, đơn hàng hoặc dữ liệu cá nhân mẫu. Chạy lại không ghi đè chỉnh sửa admin. `backend:seed` là seed catalog tối thiểu cũ, dùng độc lập khi cần; không bắt buộc cho UI hiện tại.

React/Astra hiện chưa hoàn tất yêu cầu PHP Views/TailAdmin. Catalog SSR vẫn chạy tại `/products`; xem backend README về phần còn thiếu. Thanh toán online, email và hãng vận chuyển chưa tích hợp.

## Cấu trúc

```text
frontend/src/                 React UI, types và Fetch adapter
frontend/resources/views/     PHP Views catalog SSR
frontend/public/              Static assets nội bộ
backend/app/                  Controller → Service → Repository → PDO
backend/database/             SQL migrations, seed nội dung
backend/public/uploads/       Ảnh upload, không version control
backend/tests/                Unit, MySQL integration và HTTP tests
scripts/                      Launcher Vite/PHP, setup môi trường
rules.md, spec.md             Kiến trúc, phạm vi và quyết định tích hợp
```

## Kiểm tra

```sh
npm run build
npm run typecheck
npm test
npm run backend:lint
npm run backend:test
npm run backend:test-db
npm run backend:test-http
```

Integration tests chỉ dùng database riêng có đuôi `_test`, mặc định `computer_store_test`. HTTP tests khởi động PHP ở cổng tạm, tạo/dọn fixtures riêng; có kiểm hai checkout tranh tồn kho và hai yêu cầu hủy đồng thời. Frontend tests kiểm Fetch/CSRF/cache/quyền riêng tư và React context. Format frontend bằng `npm run format -- src`; giữ object type TypeScript nhiều thuộc tính ở dạng nhiều dòng vì formatter hiện tại xử lý sai dấu phân cách của type viết cùng dòng.

## Image credits

Local product illustrations are sourced from publicly available manufacturer/retailer photography (GEARVN / Hstatic) for this educational project and may depict a representative model. Editorial photos: Agung Raharja, Back2Gaming and Olivie Zemanova via Unsplash. Replace or license imagery appropriately before commercial use.

## Documentation baseline and implementation gaps

Ngày đối chiếu **2026-11-07**. Đặc tả chính: [Computer_Store_SRS_Assignment.pdf](Computer_Store_SRS_Assignment.pdf), v2.0,14 trang; [report.pdf](report.pdf),40 trang là báo cáo bổ sung, không là kết quả kiểm thử mới. [make-doc-skill-plan.md](make-doc-skill-plan.md) quy định nội dung bộ Markdown. Source inspected không đồng nghĩa đã nghiệm thu.

Các khoảng trống cần hoàn thiện được giữ rõ: PHP Views/TailAdmin toàn site; đổi/reset mật khẩu và avatar; quản trị danh mục/nhiều ảnh; SKU/slug/mô tả/SEO metadata; trạng thái xử lý giỏ FR-P10; subject liên hệ đang ghi hằng; FAQ ordering; QA trình duyệt/W3C/responsive/performance và cài sạch. Report còn metadata lớp/email/phân công cần user xác nhận. Không tự cho rằng app đủ P0 chỉ vì CRUD/transaction có code.

## Tech stack: current and target

| Thành phần | Current source / manifest | Target / giới hạn |
| --- | --- | --- |
| Server | PHP8.3, PDO MySQL, Composer PSR-4, MVC/Service/Repository tự viết | PHP duy nhất xử lý nghiệp vụ server, không PHP framework/ORM/CMS |
| Frontend | React19, TypeScript5.7, Vite8, Tailwind4/Astra theo manifest | DB-03 chuyển tiếp; hoàn thiện PHP Views và TailAdmin Free; không gọi Astra là TailAdmin |
| Database | MySQL8.x8.0.16+ hoặc NAS26.7.x theo source/DB-02; InnoDB,utf8mb4 | 21 bảng dữ liệu/hỗ trợ + schema_migrations; SQL migrations là schema chuẩn |
| Identity | PHP Session/password_hash/RBAC/ownership/CSRF | Không JWT tự xây; password reset/session policy còn chốt |
| Tooling | Node22.12+ dòng22, pnpm10.34.3 theo .mise.toml, npm scripts | Node chỉ build/dev proxy, không backend runtime |
| Verification | node:test frontend, PHP unit/lint, MySQL/HTTP tests riêng _test | Không có dedicated test:e2e/load command được xác nhận |

Các version dependency trên là dòng manifest/config, không claim kiểm lại package installed hoặc DB version trong task tài liệu. [Tech-stack](doc/tech-stack.md) có lý do/trade-offs; [repository-layout](doc/repository-layout.md) có entry points/ownership/output thật.

## Environment and configuration checklist

Chuẩn bị PHP8.3 + fileinfo/mbstring/PDO/PDO MySQL và Composer autoload; Node/pnpm theo cấu hình; database ứng dụng và database có đuôi `_test` riêng. Chỉ sao chép `backend/.env.example` khi `.env` chưa tồn tại; không ghi đè config local. Điền DB_HOST/PORT/DATABASE/TEST_DATABASE/USERNAME/PASSWORD và bootstrap Admin riêng; không đưa giá trị secret vào frontend/Git/report. Có quyền ghi uploads/session cache và kết nối DB, chưa cần mở API thanh toán/email/giao vận.

Seed store không tạo demo accounts; Member đăng ký, Admin CLI từ biến môi trường. Không default password, không đọc/copy `.tools/admin-credentials.json` vào tài liệu. [Demo accounts/fixtures](doc/demo-accounts.md) là nơi sở hữu matrix và negative cases. Setup/migrate/seed/init có tác động dữ liệu theo bảng scripts; không chạy trên DB thật để thử.

## Run manually without the launcher

Chạy tại **root**, sau khi đã cài dependencies, Composer autoload, cấu hình và migrate/seed phù hợp theo các bước khởi tạo ở trên. Kiểm cổng8443/8000/server hiện hữu trước để không mở trùng. Hai terminal riêng; script launcher hiện là cách mặc định thuận tiện.

Terminal PHP trên PowerShell:

```powershell
$phpBinary = ".\.tools\php\php.exe"
if (-not (Test-Path -LiteralPath $phpBinary)) { $phpBinary = "php" }
New-Item -ItemType Directory -Force -Path .\backend\public\assets | Out-Null
Copy-Item -Path .\frontend\public\* -Destination .\backend\public\assets -Recurse -Force
& $phpBinary -d upload_max_filesize=5M -d post_max_size=6M -S 127.0.0.1:8000 -t backend/public backend/router.php
```

Copy static assets chỉ đồng bộ file public vào backend/public/assets, không DB; thực hiện lại khi assets đổi. Không copy `.env`/source private vào webroot. Catalog SSR: http://127.0.0.1:8000/products.

Terminal frontend tại root:

```powershell
$env:BACKEND_URL = "http://127.0.0.1:8000"
pnpm.cmd --dir frontend exec vite --host 127.0.0.1 --port 8443 --strictPort
```

UI http://localhost:8443/ và http://localhost:8443/#/admin. Proxy API/uploads/products/assets cần cùng PHP; nếu đổi cổng phải đổi BACKEND_URL tương ứng. Ctrl+C dừng từng process. `frontend/dist` cần web server PHP/same-origin proxy, không deploy dist riêng như full ứng dụng. HTTPS/Secure cookie và DocumentRoot backend/public cần cấu hình ở production; PHP dev server chỉ phát triển.

## Script reference

Tất cả command từ root, Windows dùng `.cmd` khi PowerShell chặn npm.ps1. Chỉ kiểm script tồn tại trong lần viết doc; không chạy setup/build/test/DB/server trong task tài liệu này.

| Script command | Script entry thật | Điều kiện / tác động |
| --- | --- | --- |
| `npm.cmd run dev` | `node scripts/dev.mjs` | Vite/reuse dev project; port8443 |
| `npm.cmd run build` | `npm run build --workspace frontend --` | Generate frontend/dist |
| `npm.cmd run preview` | `npm run preview --workspace frontend --` | Preview build frontend; vẫn cần PHP backend |
| `npm.cmd run typecheck` | `npm run typecheck --workspace frontend` | TS check |
| `npm.cmd run test` | `npm run test --workspace frontend` | node:test frontend |
| `npm.cmd run format` | `npm run format --workspace frontend --` | Có thể rewrite source theo path được truyền |
| `npm.cmd run backend:setup` | `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup-backend.ps1 -SkipMySql` | Download local PHP/Composer/CA; cần mạng và dependencies OS |
| `npm.cmd run backend:init` | `node scripts/backend.mjs init` | Create missing app/test DB, không drop/truncate |
| `npm.cmd run backend:connection` | `node scripts/backend.mjs connection` | Read DB connection/version/schema, không secret output |
| `npm.cmd run backend:start-db` | `node scripts/backend.mjs start-db` | Windows local DB helper nếu đã chọn; không bật DB khác thay NAS |
| `npm.cmd run backend:stop-db` | `node scripts/backend.mjs stop-db` | Dừng local DB helper đã chọn, không NAS |
| `npm.cmd run backend:doctor` | `node scripts/backend.mjs doctor` | Read diagnostics |
| `npm.cmd run backend:migrate` | `node scripts/backend.mjs migrate` | DDL+ledger; lỗi có thể partial, không sửa applied SQL |
| `npm.cmd run backend:seed` | `node scripts/backend.mjs seed` | Legacy catalog seed tối thiểu, không bắt buộc cùng seed-store |
| `npm.cmd run backend:seed-store` | `node scripts/backend.mjs seed-store` | Public content một lần, không users/orders hoặc overwrite edits |
| `npm.cmd run backend:create-admin` | `node scripts/backend.mjs create-admin` | Tạo Admin chưa có từ local env, không reset tài khoản cũ |
| `npm.cmd run backend:test` | `node scripts/backend.mjs test` | PHP unit, không DB |
| `npm.cmd run backend:test-db` | `node scripts/backend.mjs test-db` | Writes/rollback fixtures ở DB _test |
| `npm.cmd run backend:test-http` | `node backend/tests/http.mjs` | PHP temp port + _test fixtures/cleanup/concurrency |
| `npm.cmd run backend:lint` | `node scripts/backend.mjs lint` | PHP syntax |
| `npm.cmd run dev:backend` | `node scripts/backend.mjs serve` | Copy static assets + PHP8000 |


## Verification and troubleshooting notes

401: kiểm account active/session;403: kiểm role/CSRF, token sau login/logout có đổi;409: unique key/stock/quote/order state;503: PHP/DB/schema/shipping config chưa sẵn sàng. UI không fallback mock. Không gửi password/hash/token hoặc credentials để debug. Khi cần DB/HTTP tests chỉ dùng DB `_test`, không target application DB. Lỗi build/commands phải có actual log/head/environment, không suy từ source thành Pass. Scripts chưa có E2E/load riêng thì dùng planned manual cases/runner ticket, không bịa npm command.

## Documentation index

| Document | Trách nhiệm |
| --- | --- |
| [make-doc-plan.md](doc/make-doc-plan.md) | Nguồn, manifest, crosswalk policy và kiểm tra tài liệu |
| [summary-assigment.md](doc/summary-assigment.md) | 39 FR/12 NFR, BR/TC, scope/gaps và legacy crosswalk |
| [explain-detail.md](doc/explain-detail.md) | Thuật ngữ, ví dụ và cách hiểu dễ sai |
| [tech-stack.md](doc/tech-stack.md) | Stack/decisions/trade-offs/NFR controls |
| [structure-architecture.md](doc/structure-architecture.md) | Boundaries/dependencies/wiring và cây thiết kế |
| [repository-layout.md](doc/repository-layout.md) | Filesystem/entries/scripts/ownership hiện tại |
| [domain-know-how.md](doc/domain-know-how.md) | Nghiệp vụ, lifecycle và invariants |
| [demo-accounts.md](doc/demo-accounts.md) | Cách cấp accounts, seed/fixtures và scope checks |
| [user-flow.md](doc/user-flow.md) | Use case và20 user flows có source/vector diagrams |
| [schema-database.md](doc/schema-database.md) | EERD và field mapping đủ179 columns/22 tables |
| [work-flow.md](doc/work-flow.md) | Ticket/labels/GitHub/Git/PR rules,22 API entries và traceability |
| [backlog.md](doc/backlog.md) | 65 tickets, Feature/milestone/capacity/Kanban/Project readiness |

Quy trình execution: ticket được giao → branch từ updated main → implement/checks → PR → **người dùng review/approve/merge/accept**. [Backlog](doc/backlog.md) giữ local plan; task docs chưa tạo issue/Project/milestone/label/PR, không tự sync Markdown với GitHub.
