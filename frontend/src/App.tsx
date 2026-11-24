import { useEffect, useState, lazy, Suspense } from "react"
import { ThemeProvider, Button, IconButton, useTheme } from "@figma/astraui"
import { InputField } from "./fields"
import {
  Search,
  User,
  ShoppingCart,
  Phone,
  MapPin,
  ChevronDown,
  ChevronRight,
  Menu,
  Zap,
  ShieldCheck,
  Truck,
  Headphones,
  ArrowRight,
  ArrowUpRight,
  Heart,
  Package,
  Mail,
  Cpu,
  Monitor,
  Settings,
  LogOut,
} from "lucide-react"
import ShopProvider from "./context"
import { useShop } from "./shop-context"
import { api } from "./service"
import { money } from "./data"
import { go, NavLink, Title, ProductCard, categoryIcons } from "./ui"
const StorePages = lazy(() => import("./StorePages"))
const ContentPages = lazy(() => import("./ContentPages"))
const Admin = lazy(() => import("./Admin"))

function useRoute() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || "/")
  useEffect(() => {
    const change = () => setRoute(window.location.hash.slice(1) || "/")
    window.addEventListener("hashchange", change)
    return () => window.removeEventListener("hashchange", change)
  }, [])
  return route
}
function Brand({ light = false }: { light?: boolean }) {
  return (
    <Button
      variant="subtle"
      className={`brand ${light ? "brand-light" : ""}`}
      onClick={() => go("/")}
      aria-label="TechZone - Trang chủ"
    >
      <span className="brand-mark">
        <Zap size={25} fill="currentColor" strokeWidth={1.5} />
      </span>
      <span>
        tech<span className="brand-accent">zone</span>
        <span className="brand-period">.</span>
      </span>
    </Button>
  )
}
function Header({ route }: { route: string }) {
  const { db, user, sync, setAuth, setRegister, setAuthError } = useShop()
  const [query, setQuery] = useState("")
  const [mobile, setMobile] = useState(false)
  const [categoryMenu, setCategoryMenu] = useState(false)
  useEffect(() => {
    setMobile(false)
    setCategoryMenu(false)
  }, [route])
  const count = api.cart(db).reduce((n, i) => n + i.quantity, 0)
  const setting = (id: string, fallback: string) =>
    db.content.settings.find((s) => s.id === id && s.status === "published")
      ?.body ?? fallback
  return (
    <header className="site-header">
      <div className="top-strip">
        <div className="container top-strip-inner">
          <span className="flex items-center gap-md">
            <ShieldCheck size={13} /> Công nghệ chính hãng. Trải nghiệm xứng
            tầm.
          </span>
          <div className="top-links">
            <NavLink to="/about">
              <MapPin size={12} /> Hệ thống cửa hàng
            </NavLink>
            <NavLink to="/account">
              <Package size={12} /> Tra cứu đơn hàng
            </NavLink>
            <span>
              <Phone size={12} /> Hotline:{" "}
              <strong>{setting("setting-phone", "Chưa cập nhật")}</strong>
            </span>
          </div>
        </div>
      </div>
      <div className="container header-main">
        <Brand />
        <form
          className="header-search"
          onSubmit={(e) => {
            e.preventDefault()
            go(`/products?q=${encodeURIComponent(query)}`)
          }}
        >
          <InputField
            aria-label="Tìm kiếm sản phẩm"
            value={query}
            onChange={setQuery}
            placeholder="Bạn đang tìm linh kiện gì?"
            prefix={<Search size={18} />}
          />
          <Button type="submit" aria-label="Tìm kiếm">
            <Search size={19} />
          </Button>
        </form>
        <div className="header-actions">
          {user ? (
            <details className="header-user-menu" key={route}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.open = false
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.currentTarget.open = false
                  event.currentTarget.querySelector("summary")?.focus()
                }
              }}>
              <summary aria-label="Menu tài khoản">
                <User size={25} strokeWidth={1.5} />
                <span>{user.name.split(" ").slice(-2).join(" ")}</span>
                <ChevronDown size={14} />
              </summary>
              <nav className="header-user-dropdown" aria-label="Tài khoản của bạn">
                <NavLink to="/account"><Package size={17} /> Đơn hàng của tôi</NavLink>
                <NavLink to="/account?tab=profile"><User size={17} /> Thông tin cá nhân</NavLink>
                <NavLink to="/account?tab=favorites"><Heart size={17} /> Sản phẩm yêu thích</NavLink>
                <button type="button" onClick={() => sync(async () => { await api.logout(); go("/") })}><LogOut size={17} /> Đăng xuất</button>
              </nav>
            </details>
          ) : (
            <div className="header-auth-links">
              <button type="button" onClick={() => { setRegister(false); setAuthError(""); setAuth(true) }}>Đăng nhập</button>
              <button type="button" onClick={() => { setRegister(true); setAuthError(""); setAuth(true) }}>Đăng ký</button>
            </div>
          )}
          <span className="header-divider" />
          <Button
            variant="subtle"
            className="header-cart"
            onClick={() => go("/cart")}
          >
            <span className="cart-symbol">
              <ShoppingCart size={26} strokeWidth={1.5} />
              <span className="cart-count">{count}</span>
            </span>
            <span>Giỏ hàng</span>
          </Button>
          <IconButton
            className="mobile-menu"
            variant="subtle"
            icon={<Menu />}
            aria-label="Mở menu"
            onClick={() => setMobile(!mobile)}
          />
        </div>
      </div>
      <div className="nav-border">
        <div className="container main-nav">
          <div className="category-nav-wrap">
            <Button
              className="category-nav"
              iconStart={<Menu size={19} />}
              iconEnd={<ChevronDown size={15} />}
              onClick={() => setCategoryMenu(!categoryMenu)}
            >
              Danh mục sản phẩm
            </Button>
            {categoryMenu && (
              <div className="category-dropdown">
                <CategoryList />
              </div>
            )}
          </div>
          <nav
            className={`nav-links ${mobile ? "is-open" : ""}`}
            aria-label="Điều hướng chính"
          >
            {[
              ["/", "Trang chủ"],
              ["/products", "Sản phẩm"],
              ["/services", "Dịch vụ"],
              ["/pricing", "Bảng giá"],
              ["/news", "Tin công nghệ"],
              ["/about", "Giới thiệu"],
              ["/contact", "Liên hệ"],
            ].map(([path, name]) => (
              <NavLink
                key={path}
                to={path}
                className={route.split("?")[0] === path ? "active" : ""}
              >
                {name}
              </NavLink>
            ))}
          </nav>
          <NavLink to="/products?sale=1" className="nav-sale">
            <Zap size={15} fill="currentColor" /> Ưu đãi hôm nay
          </NavLink>
        </div>
      </div>
      {user?.role === "ADMIN" && (
        <div className="admin-access">
          <span>Bạn đang đăng nhập với quyền quản trị viên</span>
          <NavLink to="/admin">
            <Settings size={14} /> Mở trang quản trị <ArrowRight size={14} />
          </NavLink>
          <Button
            variant="subtle"
            size="small"
            onClick={() => sync(() => api.logout())}
          >
            <LogOut size={14} /> Đăng xuất
          </Button>
        </div>
      )}
    </header>
  )
}
function CategoryList() {
  const categories = useShop().db.categories
  return (
    <div className="category-list">
      {categories.map((category) => {
        const Icon =
          categoryIcons[(category.id as keyof typeof categoryIcons)] ?? Cpu
        return (
          <Button
            key={category.id}
            variant="subtle"
            onClick={() => go(`/products?category=${category.id}`)}
            iconStart={<Icon size={18} strokeWidth={1.5} />}
            iconEnd={<ChevronRight size={13} />}
          >
            {category.name}
          </Button>
        )
      })}
    </div>
  )
}
function Benefits({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`benefits ${compact ? "benefits-footer" : ""}`}>
      {[
        {
          icon: ShieldCheck,
          title: "100% chính hãng",
          sub: "An tâm trong từng lựa chọn",
        },
        {
          icon: Truck,
          title: "Giao hàng toàn quốc",
          sub: "Miễn phí từ " + money(useShop().db.shipping.freeFrom),
        },
        {
          icon: Settings,
          title: "Bảo hành tận tâm",
          sub: "Hỗ trợ nhanh, đúng cam kết",
        },
        {
          icon: Headphones,
          title: "Tư vấn chuyên sâu",
          sub: "Đúng nhu cầu, tối ưu chi phí",
        },
      ].map(({ icon: Icon, title, sub }) => (
        <div className="benefit" key={title}>
          <span className="benefit-icon">
            <Icon size={25} strokeWidth={1.5} />
          </span>
          <div>
            <strong>{title}</strong>
            <p>{sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
function Home() {
  const { db, act, sync } = useShop()
  const categories = db.categories
  const liked = api.favorites(db)
  const [tab, setTab] = useState("all")
  const [slide, setSlide] = useState(0)
  const [seconds, setSeconds] = useState(
    () =>
      Math.max(
        0,
        Math.floor(
          (Date.parse(
            db.content.settings.find((entry) => entry.id === "sale-ends-at")
              ?.body ?? "",
          ) -
            Date.now()) /
            1000,
        ),
      ) || 0,
  )
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [])
  const products = db.products
    .filter(
      (p) =>
        p.status === "active" &&
        p.featured &&
        (tab === "all" || p.category === tab),
    )
    .slice(0, 5)
  return (
    <main className="container home">
      <div className="welcome-line">
        <span className="flex items-center gap-md">
          <span className="tiny-dot" /> NÂNG CẤP CÔNG NGHỆ, NÂNG TẦM TRẢI NGHIỆM
        </span>
        <span>
          Đồng hành cùng mọi đam mê của bạn <ArrowUpRight size={14} />
        </span>
      </div>
      <section className="hero-layout" aria-label="Ưu đãi nổi bật">
        <aside className="hero-categories">
          <CategoryList />
        </aside>
        <div className={`hero-banner hero-slide-${slide}`}>
          <div className="hero-grid" />
          <div className="hero-copy">
            <span className="hero-eyebrow">
              <span />{" "}
              {slide === 0
                ? "PC GAMING THẾ HỆ MỚI"
                : "SỨC MẠNH CHO NHÀ SÁNG TẠO"}
            </span>
            <div role="heading" aria-level={1} className="hero-title">
              {slide === 0 ? (
                <>
                  Hiệu năng đỉnh cao.
                  <br />
                  <span>
                    Bứt phá mọi
                    <br />
                    giới hạn.
                  </span>
                </>
              ) : (
                <>
                  Kiến tạo ý tưởng.
                  <br />
                  <span>
                    Làm chủ mọi
                    <br />
                    thử thách.
                  </span>
                </>
              )}
            </div>
            <p>
              Cấu hình mạnh mẽ. Thiết kế ấn tượng.
              <br />
              Sẵn sàng cho mọi trận đấu.
            </p>
            <div className="hero-price">
              Chỉ từ{" "}
              <strong>
                {money(
                  Number(
                    db.content.settings.find(
                      (entry) => entry.id === "hero-price",
                    )?.body ?? 0,
                  ),
                )}
              </strong>
            </div>
            <Button
              onClick={() => go("/products?category=pc")}
              iconEnd={<ArrowRight size={16} />}
            >
              Khám phá ngay
            </Button>
            <div className="hero-logos">
              <span>
                intel<span className="logo-reg">®</span>
              </span>
              <span className="nvidia-logo">
                NVIDIA<span>GEFORCE RTX</span>
              </span>
              <span className="hero-guarantee">
                <ShieldCheck size={16} /> Bảo hành 36 tháng
              </span>
            </div>
          </div>
          <img
            className="hero-pc"
            src="/images/hero-pc.webp"
            alt="Máy tính gaming hiệu năng cao với hệ thống tản nhiệt và đèn RGB"
          />
          <div className="hero-orbit" />
          <span className="hero-corner-label">POWERED BY PASSION.</span>
          <div className="hero-pagination">
            {[0, 1].map((s) => (
              <IconButton
                key={s}
                aria-label={`Banner ${s + 1}`}
                className={slide === s ? "selected" : ""}
                variant="subtle"
                onClick={() => setSlide(s)}
                icon={<span />}
              />
            ))}
          </div>
        </div>
        <div className="hero-promos">
          <div className="promo promo-gpu">
            <div className="promo-text">
              <span>NVIDIA GEFORCE RTX 40 SERIES</span>
              <div role="heading" aria-level={2}>
                Đồ họa vượt trội.
                <br />
                Trải nghiệm khác biệt.
              </div>
              <NavLink to="/products?category=gpu">
                Khám phá ngay <ArrowRight size={14} />
              </NavLink>
            </div>
            <img src="/images/gpu-asus.webp" alt="Card đồ họa GeForce RTX" />
          </div>
          <div className="promo promo-monitor">
            <div className="promo-text">
              <span>MÀN HÌNH GAMING</span>
              <div role="heading" aria-level={2}>
                Mượt từng chuyển động.
                <br />
                Sắc từng chi tiết.
              </div>
              <NavLink to="/products?category=monitor">
                Nâng cấp ngay <ArrowRight size={14} />
              </NavLink>
            </div>
            <img
              src="/images/monitor-asus.webp"
              alt="Màn hình gaming ASUS TUF"
            />
          </div>
        </div>
      </section>
      <Benefits />
      <section className="category-section">
        <Title sub="Linh kiện phù hợp cho mọi cấu hình">Bạn đang tìm gì?</Title>
        <div className="category-tiles">
          {categories
            .filter((c) => !["psu", "case", "cooling"].includes(c.id))
            .map((category) => {
              const Icon =
                categoryIcons[(category.id as keyof typeof categoryIcons)] ??
                Cpu
              return (
                <Button
                  variant="subtle"
                  key={category.id}
                  className="category-tile"
                  onClick={() => go(`/products?category=${category.id}`)}
                >
                  <span className={`category-tile-icon icon-${category.id}`}>
                    <Icon size={31} strokeWidth={1.3} />
                  </span>
                  <strong>{category.short}</strong>
                  <span>{category.detail}</span>
                </Button>
              )
            })}
        </div>
      </section>
      <section className="deals-section">
        <div className="deal-heading">
          <div className="deal-title">
            <span className="deal-zap">
              <Zap size={25} fill="currentColor" />
            </span>
            <div role="heading" aria-level={2}>
              Deal ngon mỗi ngày
            </div>
            <span className="deal-label">GIÁ TỐT · SỐ LƯỢNG CÓ HẠN</span>
          </div>
          <div className="deal-clock">
            <span>Kết thúc sau</span>
            {[
              Math.floor(seconds / 3600),
              Math.floor(seconds / 60) % 60,
              seconds % 60,
            ].map((value, i) => (
              <span className="clock-part" key={i}>
                {String(value).padStart(2, "0")}
              </span>
            ))}
            <NavLink to="/products?sale=1">
              Xem tất cả <ArrowRight size={15} />
            </NavLink>
          </div>
        </div>
        <div className="deal-tabs">
          {[
            ["all", "Tất cả"],
            ...categories
              .slice(0, 5)
              .map((category) => [category.id, category.short]),
          ].map(([id, label]) => (
            <Button
              key={id}
              variant="subtle"
              className={tab === id ? "selected" : ""}
              onClick={() => setTab(id)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              liked={liked.includes(p.id)}
              add={() =>
                void act(
                  () => api.addToCart(p.id),
                  "Đã thêm sản phẩm vào giỏ hàng.",
                )
              }
              favorite={() => sync(() => api.favorite(p.id))}
            />
          ))}
        </div>
        <p className="deals-note">
          <ShieldCheck size={14} /> Giá đã bao gồm VAT · Bảo hành chính hãng ·
          Hỗ trợ trả góp tại cửa hàng
        </p>
      </section>
      <section className="build-banner">
        <span className="build-icon">
          <Cpu size={40} strokeWidth={1.25} />
        </span>
        <div>
          <span className="eyebrow">CẤU HÌNH CỦA BẠN. DẤU ẤN CỦA BẠN.</span>
          <div role="heading" aria-level={2}>
            Một chiếc PC. Vô vàn khả năng.
          </div>
          <p>
            Để TechZone giúp bạn chọn cấu hình phù hợp với đam mê và ngân sách.
          </p>
        </div>
        <Button
          onClick={() => go("/contact")}
          iconEnd={<ArrowUpRight size={16} />}
        >
          Tư vấn cấu hình miễn phí
        </Button>
      </section>
      <section className="featured-section">
        <Title
          sub="Được yêu thích bởi cộng đồng TechZone"
          action={
            <NavLink to="/products">
              Khám phá sản phẩm <ArrowRight size={15} />
            </NavLink>
          }
        >
          Lựa chọn cho góc máy của bạn
        </Title>
        <div className="product-grid">
          {db.products
            .filter((p) => p.status === "active")
            .slice(5, 10)
            .map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                liked={liked.includes(p.id)}
                add={() =>
                  void act(() => api.addToCart(p.id), "Đã thêm vào giỏ hàng.")
                }
                favorite={() => sync(() => api.favorite(p.id))}
              />
            ))}
        </div>
      </section>
      <section className="brands-section">
        <span>ĐỒNG HÀNH CÙNG CÁC THƯƠNG HIỆU HÀNG ĐẦU</span>
        <div>
          {db.brands.map((brand) => (
            <Button
              key={brand}
              variant="subtle"
              onClick={() =>
                go(
                  `/products?brand=${
                    brand.toLowerCase() === "msi"
                      ? "MSI"
                      : brand === "intel"
                        ? "Intel"
                        : brand === "CORSAIR"
                          ? "Corsair"
                          : brand === "SAMSUNG"
                            ? "Samsung"
                            : brand
                  }`,
                )
              }
            >
              {brand}
            </Button>
          ))}
        </div>
      </section>
      <section className="news-section">
        <Title
          sub="Cập nhật xu hướng. Hiểu hơn về công nghệ."
          action={
            <NavLink to="/news">
              Tất cả bài viết <ArrowRight size={15} />
            </NavLink>
          }
        >
          Góc công nghệ
        </Title>
        <div className="news-grid">
          {db.content.articles
            .filter((a) => a.status === "published")
            .slice(0, 3)
            .map((article) => (
              <article className="news-card" key={article.id}>
                <Button
                  variant="subtle"
                  className="news-image-button"
                  onClick={() => go(`/news/${article.id}`)}
                >
                  <img src={article.image} alt={article.title} loading="lazy" />
                </Button>
                <div className="news-meta">
                  <span>{article.extra}</span>
                  <span>
                    {new Date(article.createdAt).toLocaleDateString("vi-VN")} ·
                    {Math.max(
                      1,
                      Math.ceil(article.body.split(/\s+/).length / 200),
                    )}{" "}
                    phút đọc
                  </span>
                </div>
                <Button
                  variant="subtle"
                  className="news-title"
                  onClick={() => go(`/news/${article.id}`)}
                >
                  {article.title}
                </Button>
                <NavLink to={`/news/${article.id}`}>
                  Đọc bài viết <ArrowUpRight size={14} />
                </NavLink>
              </article>
            ))}
        </div>
      </section>
    </main>
  )
}
function Footer() {
  const { db, act } = useShop()
  const [email, setEmail] = useState("")
  const settings = (id: string, fallback: string) =>
    db.content.settings.find((s) => s.id === id && s.status === "published")
      ?.body ?? fallback
  return (
    <footer>
      <div className="newsletter">
        <div className="container newsletter-inner">
          <span className="newsletter-icon">
            <Mail size={29} strokeWidth={1.5} />
          </span>
          <div>
            <div role="heading" aria-level={2}>
              Công nghệ mới. Ưu đãi mới. Dành cho bạn.
            </div>
            <p>
              Đăng ký để không bỏ lỡ deal tốt và những cập nhật từ TechZone.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void act(async () => {
                await api.newsletter(email)
                setEmail("")
              }, "Đăng ký nhận tin thành công!")
            }}
          >
            <InputField
              aria-label="Email nhận tin"
              type="email"
              required
              placeholder="Nhập địa chỉ email của bạn"
              value={email}
              onChange={setEmail}
            />
            <Button type="submit" iconEnd={<ArrowRight size={16} />}>
              Đăng ký
            </Button>
          </form>
        </div>
      </div>
      <div className="container footer-content">
        <div className="footer-brand">
          <Brand />
          <p>
            Điểm đến công nghệ.
            <br />
            Đồng hành cùng mọi đam mê.
          </p>
          <div className="footer-hotline">
            <Headphones size={24} />
            <div>
              <span>Tư vấn mua hàng miễn phí</span>
              <strong>{settings("setting-phone", "Chưa cập nhật")}</strong>
            </div>
          </div>
          <p>{settings("setting-hours", "Chưa cập nhật")}</p>
        </div>
        <div>
          <strong>Về TechZone</strong>
          <NavLink to="/about">Giới thiệu TechZone</NavLink>
          <NavLink to="/news">Tin công nghệ</NavLink>
          <NavLink to="/services">Dịch vụ của chúng tôi</NavLink>
          <NavLink to="/contact">Liên hệ & góp ý</NavLink>
        </div>
        <div>
          <strong>Hỗ trợ khách hàng</strong>
          <NavLink to="/faq">Câu hỏi thường gặp</NavLink>
          <NavLink to="/policies">Chính sách bảo hành</NavLink>
          <NavLink to="/policies">Giao hàng & đổi trả</NavLink>
          <NavLink to="/pricing">Bảng giá dịch vụ</NavLink>
        </div>
        <div>
          <strong>Kết nối với TechZone</strong>
          <p>
            <MapPin size={15} />{" "}
            {db.content.company.find((c) => c.status === "published")?.extra ||
              "Địa chỉ đang được cập nhật"}
          </p>
          <p>
            <Mail size={15} /> {settings("setting-email", "Chưa cập nhật")}
          </p>
          <div className="footer-secure">
            <ShieldCheck size={19} /> Chính hãng · Tận tâm · Minh bạch
          </div>
          <NavLink to="/account">
            <User size={15} /> Tài khoản & đơn hàng
          </NavLink>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 TechZone. All rights reserved.</span>
        <span>Đồng hành cùng đam mê công nghệ</span>
        <NavLink to="/policies">Điều khoản & quyền riêng tư</NavLink>
      </div>
    </footer>
  )
}
function Shell() {
  const route = useRoute()
  const { setTheme } = useTheme()
  useEffect(() => {
    setTheme("light")
  }, [setTheme])
  if (route.startsWith("/admin"))
    return (
      <Suspense
        fallback={
          <div className="admin-locked">Đang tải trang quản trị...</div>
        }
      >
        <Admin route={route} />
      </Suspense>
    )
  const path = route.split("?")[0]
  const isStore =
    ["/products", "/cart", "/checkout", "/account", "/favorites"].includes(
      path,
    ) ||
    path.startsWith("/product/") ||
    path.startsWith("/order/")
  return (
    <>
      <Header route={route} />
      <Suspense
        fallback={
          <main className="container page">
            <div className="empty">Đang tải nội dung...</div>
          </main>
        }
      >
        {path === "/" ? (
          <Home />
        ) : isStore ? (
          <StorePages route={route} />
        ) : (
          <ContentPages route={route} />
        )}
      </Suspense>
      <Footer />
      <Button
        variant="primary"
        className="help-float"
        aria-label="Liên hệ tư vấn"
        onClick={() => go("/contact")}
      >
        <Headphones size={22} />
        <span>Tư vấn ngay</span>
      </Button>
    </>
  )
}
export default function App() {
  return (
    <ThemeProvider>
      <ShopProvider>
        <Shell />
      </ShopProvider>
    </ThemeProvider>
  )
}
