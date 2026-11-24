import { useState } from "react"
import { useRemoteList, useRemoteItem } from "./useRemoteData"
import RemotePager from "./RemotePager"
import PasswordForm from "./PasswordForm"
import {
  Button,
  IconButton,
  SelectField,
  Checkbox,
  Modal,
  Badge,
} from "@figma/astraui"
import { InputField, TextareaField } from "./fields"
import {
  ArrowRight,
  ArrowLeft,
  Heart,
  ShieldCheck,
  Truck,
  ShoppingCart,
  Trash2,
  SlidersHorizontal,
  CheckCircle,
  CreditCard,
  User,
  Package,
  LogOut,
  Search,
  ChevronRight,
  Check,
} from "lucide-react"
import { api } from "./service"
import { useShop } from "./shop-context"
import {
  money,
  orderLabels,
  type Order,
  type OrderStatus,
  type Product,
} from "./data"
import {
  Breadcrumb,
  Empty,
  go,
  NavLink,
  ProductCard,
  ProductImage,
  Quantity,
  Title,
  categoryName,
} from "./ui"

function Catalog({
  route,
  favorites = false,
}: {
  route: string
  favorites?: boolean
}) {
  const { db, act, sync } = useShop()
  const params = new URLSearchParams(route.split("?")[1])
  const [category, setCategory] = useState(params.get("category") ?? "")
  const [brand, setBrand] = useState(params.get("brand") ?? "")
  const [price, setPrice] = useState("all")
  const [sort, setSort] = useState("featured")
  const [query, setQuery] = useState(params.get("q") ?? "")
  const [inStock, setInStock] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)
  const liked = api.favorites(db)
  const categories = db.categories
  const brands = db.brands
  const remote = useRemoteList<Product>("products", {
    q: query,
    category,
    brand,
    page,
    perPage: 8,
    sort,
    stock: inStock ? 1 : undefined,
    sale: params.has("sale") ? 1 : undefined,
    favorites: favorites ? 1 : undefined,
    minPrice:
      price === "2to5" ? 2000000 : price === "over5" ? 5000000.01 : undefined,
    maxPrice:
      price === "under2" ? 1999999.99 : price === "2to5" ? 5000000 : undefined,
  })
  const products = remote.items
  function reset() {
    setCategory("")
    setBrand("")
    setPrice("all")
    setQuery("")
    setInStock(false)
    setPage(1)
  }
  function change(setter: (v: string) => void, value: string) {
    setter(value)
    setPage(1)
  }
  const totalPages = remote.pagination.totalPages
  return (
    <main className="container page">
      <Breadcrumb name={favorites ? "Sản phẩm yêu thích" : "Sản phẩm"} />
      <div className="catalog-banner">
        <span className="eyebrow">CHÍNH HÃNG · GIÁ TỐT · TƯ VẤN TẬN TÂM</span>
        <div role="heading" aria-level={1}>
          {favorites
            ? "Những lựa chọn bạn yêu thích."
            : category
              ? categories.find((c) => c.id === category)?.name
              : "Nâng cấp từng linh kiện. Bứt phá mọi trải nghiệm."}
        </div>
        <p>Khám phá những lựa chọn xứng đáng cho cấu hình của bạn.</p>
      </div>
      <div className="catalog-layout">
        <aside className={`filter-panel ${filtersOpen ? "filter-open" : ""}`}>
          <div className="section-title">
            <strong className="flex items-center gap-md">
              <SlidersHorizontal size={17} /> Bộ lọc
            </strong>
            <Button size="small" variant="subtle" onClick={reset}>
              Đặt lại
            </Button>
          </div>
          <div className="filter-group">
            <strong>Danh mục</strong>
            <Button
              variant="subtle"
              className={!category ? "selected" : ""}
              onClick={() => change(setCategory, "")}
            >
              Tất cả sản phẩm
            </Button>
            {categories.map((c) => (
              <Button
                key={c.id}
                variant="subtle"
                className={category === c.id ? "selected" : ""}
                onClick={() => change(setCategory, c.id)}
              >
                {c.short}
                <ChevronRight size={13} />
              </Button>
            ))}
          </div>
          <SelectField
            label="Thương hiệu"
            value={brand}
            onChange={(v) => change(setBrand, v)}
            options={[
              { value: "", label: "Tất cả thương hiệu" },
              ...brands.map((b) => ({ value: b, label: b })),
            ]}
          />
          <SelectField
            label="Khoảng giá"
            value={price}
            onChange={(v) => change(setPrice, v)}
            options={[
              { value: "all", label: "Tất cả mức giá" },
              { value: "under2", label: "Dưới 2 triệu" },
              { value: "2to5", label: "2 – 5 triệu" },
              { value: "over5", label: "Trên 5 triệu" },
            ]}
          />
          <Checkbox
            key={String(inStock)}
            defaultChecked={inStock}
            onChange={(v) => {
              setInStock(v)
              setPage(1)
            }}
            label="Chỉ hiển thị còn hàng"
          />
          <div className="filter-help">
            <HeadsetMessage />
            <strong>Cần chọn cấu hình?</strong>
            <p>Chúng tôi luôn sẵn sàng tư vấn.</p>
            <NavLink to="/contact">
              Liên hệ TechZone <ArrowRight size={14} />
            </NavLink>
          </div>
        </aside>
        <section className="catalog-results">
          <div className="catalog-toolbar">
            <span>
              <strong>{remote.pagination.total}</strong> sản phẩm phù hợp
            </span>
            <Button
              variant="neutral"
              className="filter-toggle"
              iconStart={<SlidersHorizontal size={16} />}
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              Bộ lọc
            </Button>
            <div className="catalog-search">
              <InputField
                aria-label="Tìm trong danh mục"
                value={query}
                onChange={(v) => change(setQuery, v)}
                prefix={<Search size={16} />}
                placeholder="Tìm sản phẩm..."
              />
            </div>
            <SelectField
              value={sort}
              onChange={setSort}
              options={[
                { value: "featured", label: "Nổi bật nhất" },
                { value: "price-asc", label: "Giá thấp đến cao" },
                { value: "price-desc", label: "Giá cao đến thấp" },
                { value: "name", label: "Tên A – Z" },
              ]}
            />
          </div>
          {(category || brand || price !== "all" || query) && (
            <div className="filter-tags">
              {category && (
                <Badge
                  label={categoryName(category)}
                  removable
                  onRemove={() => change(setCategory, "")}
                  variant="brand"
                />
              )}
              {brand && (
                <Badge
                  label={brand}
                  removable
                  onRemove={() => change(setBrand, "")}
                />
              )}
              {query && (
                <Badge
                  label={`"${query}"`}
                  removable
                  onRemove={() => change(setQuery, "")}
                />
              )}
            </div>
          )}
          {remote.error && <p role="alert">{remote.error}</p>}
          {remote.loading && <p role="status">Đang tải sản phẩm…</p>}
          {products.length ? (
            <>
              <div className="product-grid catalog-grid">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    liked={liked.includes(p.id)}
                    add={() =>
                      void act(
                        () => api.addToCart(p.id),
                        "Đã thêm vào giỏ hàng.",
                      )
                    }
                    favorite={() => sync(() => api.favorite(p.id))}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="pagination">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <Button
                      key={i}
                      variant={page === i + 1 ? "primary" : "neutral"}
                      onClick={() => {
                        setPage(i + 1)
                        window.scrollTo({ top: 300, behavior: "smooth" })
                      }}
                    >
                      {i + 1}
                    </Button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <Empty
              title="Chưa tìm thấy sản phẩm"
              body="Thử thay đổi từ khóa hoặc bỏ bớt bộ lọc."
              action={<Button onClick={reset}>Xóa bộ lọc</Button>}
            />
          )}
        </section>
      </div>
    </main>
  )
}
function HeadsetMessage() {
  return <ShoppingCart size={24} />
}
function ProductDetail({ id }: { id: string }) {
  const { db, act, sync, busy } = useShop()
  const detail = useRemoteItem<Product>("products", id)
  const product = detail.item
  const [quantity, setQuantity] = useState(1)
  const [tab, setTab] = useState("specs")
  if (!product)
    return (
      <main className="container page">
        <Empty
          title={detail.error || "Đang tải sản phẩm…"}
          body="Sản phẩm có thể đã ngừng kinh doanh."
          action={<NavLink to="/products">Xem sản phẩm khác</NavLink>}
        />
      </main>
    )
  const liked = api.favorites(db).includes(id)
  return (
    <main className="container page">
      <Breadcrumb name={product.name} />
      <div className="product-detail">
        <div className="detail-gallery">
          <Badge label="CHÍNH HÃNG 100%" variant="brand" />
          <ProductImage product={product} />
          {(product.images?.length ?? 0) > 1 && <div className="cms-gallery">{product.images!.map(path => <a key={path} href={path} target="_blank" rel="noreferrer" aria-label="Xem ảnh sản phẩm"><img src={path} alt={product.name} /></a>)}</div>}
          <p>
            <ShieldCheck size={16} /> Hình ảnh sản phẩm mang tính minh họa
          </p>
        </div>
        <div className="detail-summary">
          <NavLink to={`/products?category=${product.category}`}>
            {categoryName(product.category)} <ChevronRight size={13} />
          </NavLink>
          <div role="heading" aria-level={1} className="text-title">
            {product.name}
          </div>
          <div className="detail-meta">
            <span>
              Thương hiệu: <strong>{product.brand}</strong>
            </span>
            <span>Mã SP: {product.id.toUpperCase()}</span>
            <span className={product.stock ? "text-success" : "text-danger"}>
              {product.stock ? `Còn ${product.stock} sản phẩm` : "Tạm hết hàng"}
            </span>
          </div>
          <div className="detail-price">
            <span>{money(product.price)}</span>
            {product.oldPrice > product.price && (
              <del>{money(product.oldPrice)}</del>
            )}
            <small>Đã bao gồm VAT</small>
          </div>
          <div className="detail-specs">
            {product.specs.map((spec) => (
              <span key={spec}>
                <Check size={15} />
                {spec}
              </span>
            ))}
          </div>
          <div className="detail-offer">
            <strong>
              <ZapIcon /> Đặc quyền tại TechZone
            </strong>
            <p>Tư vấn tương thích miễn phí · Bảo hành chính hãng</p>
            <p>
              {db.coupons
                .map(
                  (entry) =>
                    `${entry.code} · Giảm ${entry.basisPoints / 100}% · Tối đa ${money(entry.maxDiscount)}`,
                )
                .join(" · ")}
            </p>
          </div>
          <div className="detail-buy">
            <Quantity
              value={quantity}
              max={product.stock}
              change={setQuantity}
            />
            <Button
              disabled={busy || !product.stock}
              iconStart={<ShoppingCart size={18} />}
              onClick={() =>
                void act(
                  () => api.addToCart(id, quantity),
                  "Đã thêm sản phẩm vào giỏ.",
                )
              }
            >
              Thêm vào giỏ hàng
            </Button>
            <IconButton
              variant="neutral"
              aria-label="Yêu thích"
              onClick={() => sync(() => api.favorite(id))}
              icon={<Heart size={20} fill={liked ? "currentColor" : "none"} />}
            />
          </div>
          <Button
            variant="neutral"
            className="buy-now"
            disabled={busy || !product.stock}
            onClick={() =>
              void act(async () => {
                await api.addToCart(id, quantity)
                go("/checkout")
              })
            }
          >
            Mua ngay <ArrowRight size={16} />
          </Button>
          <div className="detail-benefits">
            <span>
              <Truck size={20} /> Giao hàng toàn quốc
            </span>
            <span>
              <ShieldCheck size={20} /> Bảo hành 36 tháng
            </span>
          </div>
        </div>
      </div>
      <section className="surface detail-description">
        <div className="tab-bar">
          {[
            ["specs", "Thông số kỹ thuật"],
            ["description", "Mô tả sản phẩm"],
            ["policy", "Chính sách bảo hành"],
          ].map(([key, title]) => (
            <Button
              key={key}
              variant="subtle"
              className={tab === key ? "selected" : ""}
              onClick={() => setTab(key)}
            >
              {title}
            </Button>
          ))}
        </div>
        {tab === "specs" ? (
          <div className="spec-table">
            {[
              ["Tên sản phẩm", product.name],
              ["Thương hiệu", product.brand],
              ["Danh mục", categoryName(product.category)],
              ...product.specs.map((spec, i) => [`Thông số ${i + 1}`, spec]),
              ["Bảo hành", "36 tháng chính hãng"],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="prose">
            {tab === "description"
              ? product.description || "Mô tả sản phẩm đang được cập nhật."
              : "Bảo hành chính hãng 36 tháng theo điều kiện của nhà sản xuất. Hỗ trợ đổi sản phẩm lỗi kỹ thuật trong 7 ngày sau khi kiểm tra.\n\nVui lòng giữ hóa đơn, tem và số serial. Các trường hợp hư hỏng do tác động vật lý, vào nước hoặc tự ý sửa chữa không thuộc phạm vi bảo hành."}
          </p>
        )}
      </section>
      <section className="featured-section">
        <Title>Sản phẩm cùng danh mục</Title>
        <div className="product-grid">
          {db.products
            .filter((p) => p.id !== id && p.category === product.category)
            .slice(0, 5)
            .map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                liked={api.favorites(db).includes(p.id)}
                add={() =>
                  void act(() => api.addToCart(p.id), "Đã thêm vào giỏ.")
                }
                favorite={() => sync(() => api.favorite(p.id))}
              />
            ))}
        </div>
      </section>
    </main>
  )
}
function ZapIcon() {
  return <CheckCircle size={16} />
}
function Cart() {
  const { db, sync, notify } = useShop()
  const [coupon, setCoupon] = useState("")
  const [applied, setApplied] = useState("")
  const cart = api.cart(db)
  const quote = api.quote(applied, db)
  return (
    <main className="container page">
      <Breadcrumb name="Giỏ hàng" />
      <Title
        sub={`${cart.reduce((s, i) => s + i.quantity, 0)} sản phẩm đã được chọn`}
      >
        Giỏ hàng của bạn
      </Title>
      {!cart.length ? (
        <Empty
          title="Giỏ hàng đang chờ bạn"
          body="Khám phá những linh kiện phù hợp để bắt đầu cấu hình mơ ước."
          action={
            <Button onClick={() => go("/products")}>
              Khám phá sản phẩm <ArrowRight size={16} />
            </Button>
          }
        />
      ) : (
        <div className="checkout-layout">
          <section className="surface cart-items">
            {cart.map((item) => {
              const p = db.products.find((p) => p.id === item.productId)
              if (!p) return null
              return (
                <div className="cart-item" key={item.productId}>
                  <ProductImage product={p} />
                  <div className="cart-item-info">
                    <NavLink to={`/product/${p.id}`}>{p.name}</NavLink>
                    <span className="muted">
                      {p.specs.slice(0, 2).join(" · ")}
                    </span>
                    <strong>{money(p.price)}</strong>
                  </div>
                  <Quantity
                    value={item.quantity}
                    max={p.stock}
                    change={(v) => sync(() => api.setQuantity(p.id, v))}
                  />
                  <strong className="cart-line-total">
                    {money(p.price * item.quantity)}
                  </strong>
                  <IconButton
                    aria-label="Xóa sản phẩm"
                    icon={<Trash2 size={17} />}
                    variant="subtle"
                    onClick={() => sync(() => api.setQuantity(p.id, 0))}
                  />
                </div>
              )
            })}
            <NavLink to="/products">
              <ArrowLeft size={16} /> Tiếp tục mua sắm
            </NavLink>
          </section>
          <aside className="surface order-summary">
            <div role="heading" aria-level={2} className="text-heading">
              Thông tin đơn hàng
            </div>
            <div className="coupon-form">
              <InputField
                aria-label="Mã ưu đãi"
                value={coupon}
                onChange={setCoupon}
                placeholder="Mã giảm giá"
              />
              <Button
                variant="neutral"
                onClick={() => {
                  if (
                    !db.coupons.some(
                      (entry) => entry.code === coupon.trim().toUpperCase(),
                    )
                  ) {
                    notify(
                      "Mã ưu đãi không hợp lệ hoặc đã ngừng áp dụng.",
                      true,
                    )
                    setApplied("")
                  } else {
                    setApplied(coupon.trim().toUpperCase())
                    notify("Đã áp dụng ưu đãi.")
                  }
                }}
              >
                Áp dụng
              </Button>
            </div>
            <span className="fine">
              {db.coupons
                .map(
                  (entry) =>
                    `${entry.code} · Giảm ${entry.basisPoints / 100}% · Tối đa ${money(entry.maxDiscount)}`,
                )
                .join(" · ")}
            </span>
            <Summary quote={quote} />
            <p className="shipping-tip">
              <Truck size={17} />
              {quote.shipping
                ? `Mua thêm ${money(Math.max(0, db.shipping.freeFrom - quote.subtotal + quote.discount))} để miễn phí giao hàng`
                : "Đơn hàng được miễn phí vận chuyển!"}
            </p>
            <Button
              className="w-full"
              onClick={() => go(`/checkout?coupon=${applied}`)}
              iconEnd={<ArrowRight size={16} />}
            >
              Tiến hành thanh toán
            </Button>
            <p className="summary-secure">
              <ShieldCheck size={15} /> Giao dịch an toàn · Thanh toán COD
            </p>
          </aside>
        </div>
      )}
    </main>
  )
}
function Summary({ quote }: { quote: ReturnType<typeof api.quote> }) {
  return (
    <div className="summary-lines">
      <div>
        <span>Tạm tính</span>
        <strong>{money(quote.subtotal)}</strong>
      </div>
      <div>
        <span>Giảm giá</span>
        <strong className="text-success">
          {quote.discount ? "-" : ""}
          {money(quote.discount)}
        </strong>
      </div>
      <div>
        <span>Phí vận chuyển</span>
        <strong>{quote.shipping ? money(quote.shipping) : "Miễn phí"}</strong>
      </div>
      <div className="summary-total">
        <strong>Tổng thanh toán</strong>
        <strong>{money(quote.total)}</strong>
      </div>
      <p className="fine">Đã bao gồm VAT</p>
    </div>
  )
}
function Checkout({ route }: { route: string }) {
  const { db, user, act, busy, setAuth } = useShop()
  const [name, setName] = useState(user?.name ?? "")
  const [phone, setPhone] = useState(user?.phone ?? "")
  const [address, setAddress] = useState(user?.address ?? "")
  const [note, setNote] = useState("")
  const [terms, setTerms] = useState(false)
  const [success, setSuccess] = useState("")
  const coupon = new URLSearchParams(route.split("?")[1]).get("coupon") ?? ""
  const quote = api.quote(coupon, db)
  if (success)
    return (
      <main className="container page">
        <div className="checkout-success">
          <CheckCircle size={64} strokeWidth={1.2} />
          <div role="heading" aria-level={1} className="text-title">
            Cảm ơn bạn đã chọn TechZone!
          </div>
          <p>
            Đơn hàng <strong>{success}</strong> đã được tiếp nhận.
          </p>
          <p className="muted">
            Chúng tôi sẽ liên hệ xác nhận trước khi giao hàng. Thanh toán khi
            nhận hàng (COD).
          </p>
          <Button onClick={() => go(`/order/${success}`)}>
            Xem chi tiết đơn hàng <ArrowRight size={16} />
          </Button>
          <NavLink to="/products">Tiếp tục mua sắm</NavLink>
        </div>
      </main>
    )
  if (!user)
    return (
      <main className="container page">
        <Breadcrumb name="Thanh toán" />
        <Empty
          title="Đăng nhập để đặt hàng"
          body="Giỏ hàng của bạn sẽ được giữ lại và chuyển vào tài khoản sau khi đăng nhập."
          action={
            <Button onClick={() => setAuth(true)}>
              Đăng nhập / Đăng ký <ArrowRight size={16} />
            </Button>
          }
        />
      </main>
    )
  if (!api.cart(db).length)
    return (
      <main className="container page">
        <Empty
          title="Giỏ hàng đang trống"
          body="Hãy chọn sản phẩm trước khi thanh toán."
          action={<Button onClick={() => go("/products")}>Mua sắm ngay</Button>}
        />
      </main>
    )
  return (
    <main className="container page">
      <Breadcrumb name="Thanh toán" />
      <Title sub="Chỉ một bước nữa để nâng cấp trải nghiệm công nghệ của bạn.">
        Hoàn tất đơn hàng
      </Title>
      <form
        className="checkout-layout"
        onSubmit={(e) => {
          e.preventDefault()
          void act(async () => {
            const id = await api.checkout({
              name,
              phone,
              address,
              note,
              coupon,
            })
            setSuccess(id)
          })
        }}
      >
        <div className="form-stack">
          <section className="surface form-stack">
            <div role="heading" aria-level={2} className="text-heading">
              01. Thông tin nhận hàng
            </div>
            <InputField
              label="Họ và tên người nhận"
              required
              value={name}
              onChange={setName}
              placeholder={user.name}
              autoComplete="name"
            />
            <InputField
              label="Số điện thoại"
              required
              type="tel"
              value={phone}
              onChange={setPhone}
              placeholder="0901 234 567"
              autoComplete="tel"
            />
            <TextareaField
              label="Địa chỉ giao hàng đầy đủ"
              required
              minLength={10}
              rows={3}
              value={address}
              onChange={setAddress}
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
              autoComplete="street-address"
            />
            <TextareaField
              label="Ghi chú (không bắt buộc)"
              value={note}
              onChange={setNote}
              placeholder="Lưu ý cho đơn hàng hoặc thời gian nhận hàng..."
            />
          </section>
          <section className="surface form-stack">
            <div role="heading" aria-level={2} className="text-heading">
              02. Phương thức thanh toán
            </div>
            <div className="cod-option">
              <CheckCircle size={22} />
              <CreditCard size={26} />
              <div>
                <strong>Thanh toán khi nhận hàng (COD)</strong>
                <p className="muted">
                  Kiểm tra hàng trước khi thanh toán cho đơn vị vận chuyển.
                </p>
              </div>
            </div>
            <p className="fine">
              Đơn hàng được lưu để cửa hàng xác nhận. Thanh toán COD khi nhận
              hàng.
            </p>
          </section>
        </div>
        <aside className="surface order-summary">
          <div role="heading" aria-level={2} className="text-heading">
            Đơn hàng của bạn
          </div>
          <div className="checkout-items">
            {api.cart(db).map((item) => {
              const p = db.products.find((p) => p.id === item.productId)!
              return (
                <div key={p.id}>
                  <ProductImage product={p} />
                  <span>
                    {p.name}
                    <small>SL: {item.quantity}</small>
                  </span>
                  <strong>{money(p.price * item.quantity)}</strong>
                </div>
              )
            })}
          </div>
          {coupon && <Badge label={`Ưu đãi ${coupon}`} variant="success" />}
          <Summary quote={quote} />
          <Checkbox
            label="Tôi đồng ý với điều khoản mua hàng và chính sách giao hàng."
            onChange={setTerms}
          />
          <NavLink to="/policies">Xem điều khoản mua hàng</NavLink>
          <Button
            type="submit"
            className="w-full"
            disabled={busy || !terms}
            iconEnd={<ArrowRight size={16} />}
          >
            {busy ? "Đang đặt hàng..." : "Xác nhận đặt hàng COD"}
          </Button>
          <p className="summary-secure">
            <ShieldCheck size={15} /> Thông tin được xử lý và lưu trên máy chủ
          </p>
        </aside>
      </form>
    </main>
  )
}
export function OrderCard({
  order,
  management = false,
}: {
  order: Order
  management?: boolean
}) {
  const { act, busy } = useShop()
  const [cancel, setCancel] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const next: Partial<Record<OrderStatus, OrderStatus>> = {
    pending: "confirmed",
    confirmed: "shipping",
    shipping: "completed",
  }
  const canCancel =
    management && ["pending", "confirmed"].includes(order.status)
  return (
    <article className="order-card">
      <div className="order-header">
        <div>
          <strong>{order.number ?? order.id}</strong>
          <span>{new Date(order.createdAt).toLocaleString("vi-VN")}</span>
        </div>
        <Badge
          label={orderLabels[order.status]}
          variant={
            order.status === "cancelled"
              ? "danger"
              : order.status === "completed"
                ? "success"
                : "warning"
          }
        />
      </div>
      {order.items.map((item) => (
        <div className="order-item" key={item.productId}>
          <ProductImage
            product={{ image: item.image, name: item.name, category: "" }}
          />
          <div>
            <strong>{item.name}</strong>
            <p className="muted">
              Số lượng: {item.quantity} · {money(item.price)}
            </p>
          </div>
          <strong>{money(item.price * item.quantity)}</strong>
        </div>
      ))}
      <div className="order-footer">
        <Button variant="subtle" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Ẩn chi tiết" : "Chi tiết giao hàng"}{" "}
          <ChevronRight size={14} />
        </Button>
        <span>
          Tổng cộng: <strong>{money(order.total)}</strong>
        </span>
        {management && next[order.status] && (
          <Button
            size="small"
            disabled={busy}
            onClick={() =>
              void act(
                () => api.orderStatus(order.id, next[order.status]!),
                "Đã cập nhật trạng thái đơn hàng.",
              )
            }
          >
            {orderLabels[next[order.status]!]}
          </Button>
        )}
        {canCancel && (
          <Button
            size="small"
            variant="neutral"
            onClick={() => setCancel(true)}
          >
            Hủy đơn hàng
          </Button>
        )}
      </div>
      {expanded && (
        <div className="order-details">
          <p>
            <strong>Người nhận:</strong> {order.name} · {order.phone}
          </p>
          <p>
            <strong>Địa chỉ:</strong> {order.address}
          </p>
          <p>
            <strong>Ghi chú:</strong> {order.note || "Không có"}
          </p>
          <p>
            Thanh toán COD · Tạm tính {money(order.subtotal)} · Giảm{" "}
            {money(order.discount)} · Giao hàng {money(order.shipping)}
          </p>
        </div>
      )}
      <Modal
        isOpen={cancel}
        onClose={() => setCancel(false)}
        title="Bạn muốn hủy đơn hàng?"
        className="tz-modal"
        footer={
          <>
            <Button variant="neutral" onClick={() => setCancel(false)}>
              Giữ đơn hàng
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  await api.orderStatus(order.id, "cancelled")
                  setCancel(false)
                }, "Đã hủy đơn hàng và hoàn lại tồn kho.")
              }
            >
              Xác nhận hủy
            </Button>
          </>
        }
      >
        <p>
          Đơn {order.id} sẽ được hủy. Các sản phẩm được hoàn lại kho và thao tác
          này không thể hoàn tác.
        </p>
      </Modal>
    </article>
  )
}
function AccountFavorites() {
  const { db, sync } = useShop()
  const [page, setPage] = useState(1)
  const remote = useRemoteList<Product>("products", { favorites: 1, page, perPage: 8 })
  return <>
    <Title>Sản phẩm yêu thích</Title>
    {remote.items.length > 0 ? <div className="product-grid account-favorites-grid">{remote.items.map(product => <ProductCard key={product.id} product={product} liked={api.favorites(db).includes(product.id)} add={() => sync(() => api.addToCart(product.id))} favorite={() => sync(() => api.favorite(product.id))} />)}</div> : !remote.loading && !remote.error && <Empty title="Chưa có sản phẩm yêu thích" body="Nhấn biểu tượng trái tim trên sản phẩm để lưu vào danh sách của bạn." action={<Button onClick={() => go("/products")}>Khám phá sản phẩm</Button>} />}
    <RemotePager pagination={remote.pagination} onPage={setPage} loading={remote.loading} error={remote.error} />
  </>
}
function Account({ orderId, route }: { orderId?: string; route: string }) {
  const { db, user, sync, act, setAuth, busy } = useShop()
  const requestedTab = new URLSearchParams(route.split("?")[1]).get("tab")
  const tab = route.split("?")[0] === "/favorites" ? "favorites" : requestedTab === "profile" || requestedTab === "favorites" ? requestedTab : "orders"
  const setTab = (next: string) => { window.location.hash = next === "orders" ? "/account" : `/account?tab=${next}` }
  const [name, setName] = useState(user?.name ?? "")
  const [phone, setPhone] = useState(user?.phone ?? "")
  const [address, setAddress] = useState(user?.address ?? "")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)
  const remote = useRemoteList<Order>(
    "orders",
    { page, status: status === "all" ? "" : status },
    Boolean(user) && tab === "orders",
  )
  const detail = useRemoteItem<Order>("orders", user ? orderId : undefined)
  if (!user)
    return (
      <main className="container page">
        <Empty
          title="Góc riêng của bạn tại TechZone"
          body="Đăng nhập để quản lý tài khoản và theo dõi đơn hàng."
          action={
            <Button onClick={() => setAuth(true)}>Đăng nhập / Đăng ký</Button>
          }
        />
      </main>
    )
  const orders = orderId ? (detail.item ? [detail.item] : []) : remote.items
  return (
    <main className="container page">
      <Breadcrumb name="Tài khoản của tôi" />
      <Title sub="Quản lý thông tin và hành trình mua sắm của bạn.">
        Xin chào, {user.name.split(" ").slice(-2).join(" ")}.
      </Title>
      <div className="account-layout">
        <aside className="surface account-nav">
          <div className="account-avatar">
            <User size={28} />
          </div>
          <strong>{user.name}</strong>
          <span className="muted">{user.email}</span>
          <Badge
            label={
              user.role === "ADMIN" ? "Quản trị viên" : "Thành viên TechZone"
            }
            variant="brand"
          />
          <Button
            variant="subtle"
            className={tab === "orders" ? "selected" : ""}
            onClick={() => setTab("orders")}
            iconStart={<Package size={18} />}
          >
            Đơn hàng của tôi
          </Button>
          <Button
            variant="subtle"
            className={tab === "profile" ? "selected" : ""}
            onClick={() => setTab("profile")}
            iconStart={<User size={18} />}
          >
            Thông tin cá nhân
          </Button>
          <Button
            variant="subtle"
            iconStart={<Heart size={18} />}
            className={tab === "favorites" ? "selected" : ""}
            onClick={() => setTab("favorites")}
          >
            Sản phẩm yêu thích
          </Button>
          {user.role === "ADMIN" && (
            <Button variant="subtle" onClick={() => go("/admin")}>
              Trang quản trị <ArrowRight size={16} />
            </Button>
          )}
          <Button
            variant="subtle"
            iconStart={<LogOut size={18} />}
            onClick={() =>
              sync(async () => {
                await api.logout()
                go("/")
              })
            }
          >
            Đăng xuất
          </Button>
        </aside>
        <section>
          {tab === "orders" ? (
            <>
              <Title
                action={
                  <SelectField
                    value={status}
                    onChange={setStatus}
                    options={[
                      { value: "all", label: "Tất cả trạng thái" },
                      ...Object.entries(orderLabels).map(([value, label]) => ({
                        value,
                        label,
                      })),
                    ]}
                  />
                }
              >
                Đơn hàng của tôi
              </Title>
              {!orderId && (
                <RemotePager
                  pagination={remote.pagination}
                  onPage={setPage}
                  loading={remote.loading}
                  error={remote.error}
                />
              )}
              {orderId && detail.error && <p role="alert">{detail.error}</p>}
              {orders.length ? (
                <div className="form-stack">
                  {orders.map((o) => (
                    <OrderCard key={o.id} order={o} />
                  ))}
                </div>
              ) : (
                <Empty
                  title="Chưa có đơn hàng phù hợp"
                  body="Những sản phẩm công nghệ tuyệt vời đang chờ bạn."
                  action={
                    <Button onClick={() => go("/products")}>
                      Khám phá sản phẩm
                    </Button>
                  }
                />
              )}
            </>
          ) : tab === "favorites" ? <AccountFavorites /> : (
            <form
              className="surface form-stack"
              onSubmit={(e) => {
                e.preventDefault()
                void act(
                  () => api.profile({ name, phone, address }),
                  "Đã cập nhật thông tin cá nhân.",
                )
              }}
            >
              <Title>Thông tin cá nhân</Title>
              <InputField
                label="Họ và tên"
                required
                value={name}
                onChange={setName}
              />
              <InputField
                label="Email"
                value={user.email}
                disabled
                description="Email đăng nhập không thể thay đổi tại đây."
              />
              <InputField
                label="Số điện thoại"
                type="tel"
                value={phone}
                onChange={setPhone}
              />
              <TextareaField
                label="Địa chỉ mặc định"
                value={address}
                onChange={setAddress}
              />
              <Button type="submit" disabled={busy}>
                Lưu thay đổi
              </Button>
            </form>
          )}
          {tab === "profile" && <PasswordForm />}
        </section>
      </div>
    </main>
  )
}
export default function StorePages({ route }: { route: string }) {
  const { user } = useShop()
  const path = route.split("?")[0]
  if (path === "/products") return <Catalog key={route} route={route} />
  if (path.startsWith("/product/"))
    return <ProductDetail key={path} id={path.slice(9)} />
  if (path === "/cart") return <Cart />
  if (path === "/checkout")
    return <Checkout key={user?.id ?? "guest"} route={route} />
  return <Account key={user?.id ?? "guest"} route={route} orderId={path.startsWith("/order/") ? path.slice(7) : undefined} />
}
