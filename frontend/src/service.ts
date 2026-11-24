import {
  createEmptyState,
  type Database,
  type Product,
  type Content,
  type CmsGroup,
  type OrderStatus,
  type User,
  type Order,
  type PageResult,
} from "./data"

let memory = createEmptyState()

let pending: Promise<void> | null = null

let generation = 0

const listeners = new Set<() => void>()

function publish(next: Database) {
  memory = next

  listeners.forEach((listener) => listener())
}

const product = (row: Product): Product => ({
  ...row,
  price: Number(row.price),
  oldPrice: Number(row.oldPrice),
})

const order = (row: Order): Order => ({
  ...row,
  subtotal: Number(row.subtotal),
  discount: Number(row.discount),
  shipping: Number(row.shipping),

  total: Number(row.total),
  items: row.items.map((item) => ({ ...item, price: Number(item.price) })),
})

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response

  try {
    response = await fetch(path, { credentials: "same-origin", ...options })
  } catch {
    throw new Error(
      "Không thể kết nối máy chủ. Vui lòng kiểm tra backend và thử lại.",
    )
  }

  let payload: {
    success: boolean
    data: T
    message?: string
  }

  try {
    payload = await response.json()
  } catch {
    throw new Error("Máy chủ chưa sẵn sàng. Vui lòng kiểm tra backend PHP.")
  }

  if (!response.ok || !payload.success)
    throw new Error(payload.message || "Không thể thực hiện thao tác.")

  return payload.data
}

function current(db = memory) {
  return db.users.find((user) => user.id === db.session && user.active)
}

function key(db = memory) {
  return current(db)?.id ?? "guest"
}

async function refresh(): Promise<void> {
  if (pending) return pending

  const started = generation

  const running = request<Database>("/api/store")
    .then((wire) => {
      if (started !== generation) return

      const defaults = createEmptyState()

      const metrics = { ...defaults.metrics, ...wire.metrics }

      for (const field of [
        "products",
        "lowStock",
        "orders",
        "pendingOrders",
        "revenue",
        "members",
        "subscribers",
        "unreadContacts",
        "pendingComments",
      ] as const)
        metrics[field] = Number(metrics[field])

      metrics.days = (metrics.days ?? []).map((day) => ({
        ...day,
        count: Number(day.count),
      }))

      publish({
        ...wire,
        products: wire.products.map(product),
        orders: wire.orders.map(order),

        shipping: {
          fee: Number(wire.shipping.fee),
          freeFrom: Number(wire.shipping.freeFrom),
        },

        coupons: wire.coupons.map((coupon) => ({
          ...coupon,
          maxDiscount: Number(coupon.maxDiscount),
        })),

        metrics,
        ready: true,
        error: null,
        revision: memory.revision + 1,
      })
    })
    .catch((error: Error) => {
      if (started !== generation) return

      publish({ ...memory, error: error.message })

      throw error
    })
    .finally(() => {
      if (pending === running) pending = null
    })

  pending = running

  return running
}

async function mutate<T = void>(
  action: string,
  data: unknown = {},
): Promise<T> {
  if (!memory.csrfToken) await refresh()

  const result = await request<{
    result: T
    csrfToken: string
  }>(
    `/api/store/${action}`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": memory.csrfToken,
      },

      body: JSON.stringify(data),
    },
  )

  generation += 1

  pending = null

  publish(
    action === "logout" || action === "login"
      ? {
          ...createEmptyState(),
          csrfToken: result.csrfToken,
          revision: memory.revision + 1,
        }
      : { ...memory, csrfToken: result.csrfToken },
  )

  try {
    await refresh()
  } catch {
    throw new Error(
      "Đã lưu thay đổi nhưng chưa tải lại dữ liệu. Vui lòng tải lại trang.",
    )
  }

  return result.result
}

export const api = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },

  snapshot: () => memory,

  refresh,

  user: current,

  cart(db = memory) {
    return db.carts[key(db)] ?? []
  },

  favorites(db = memory) {
    return db.favorites[key(db)] ?? []
  },

  login(email: string, password: string) {
    return mutate("login", { email, password })
  },

  register(
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string,
  ) {
    if (name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return Promise.reject(new Error("Vui lòng nhập họ tên và email hợp lệ."))

    if (password.length < 8 || password !== passwordConfirmation)
      return Promise.reject(
        new Error("Mật khẩu cần ít nhất 8 ký tự và xác nhận phải trùng khớp."),
      )

    return mutate("register", { name, email, password, passwordConfirmation })
  },

  logout() {
    return mutate("logout")
  },

  changePassword(currentPassword: string, password: string, passwordConfirmation: string) {
    return mutate("password-change", { currentPassword, password, passwordConfirmation })
  },

  resetPassword(id: string, password: string, passwordConfirmation: string) {
    return mutate("admin-password-reset", { id, password, passwordConfirmation })
  },

  profile(values: Pick<User, "name" | "phone" | "address">) {
    return mutate("profile", values)
  },

  addToCart(productId: string, quantity = 1) {
    return mutate("cart-add", { productId, quantity })
  },

  setQuantity(productId: string, quantity: number) {
    return mutate("cart-quantity", { productId, quantity })
  },

  favorite(productId: string) {
    return mutate("favorite", { productId })
  },

  quote(coupon = "", db = memory) {
    const cents = (value: number) => BigInt(Math.round(value * 100))

    const subtotal = api
      .cart(db)
      .reduce(
        (sum, item) =>
          sum +
          cents(db.products.find((p) => p.id === item.productId)?.price ?? 0) *
            BigInt(item.quantity),
        0n,
      )

    const selected = db.coupons.find(
      (entry) => entry.code === coupon.trim().toUpperCase(),
    )

    const proposed = selected
      ? (subtotal * BigInt(selected.basisPoints) + 5000n) / 10000n
      : 0n

    const discount =
      selected && proposed > cents(selected.maxDiscount)
        ? cents(selected.maxDiscount)
        : proposed

    const shipping =
      subtotal === 0n || subtotal - discount >= cents(db.shipping.freeFrom)
        ? 0n
        : cents(db.shipping.fee)

    return {
      subtotal: Number(subtotal) / 100,
      discount: Number(discount) / 100,
      shipping: Number(shipping) / 100,
      total: Number(subtotal - discount + shipping) / 100,
    }
  },

  checkout(values: {
    name: string
    phone: string
    address: string
    note: string
    coupon: string
  }) {
    return mutate<string>("checkout", {
      ...values,
      expectedTotal: api.quote(values.coupon).total.toFixed(2),
    })
  },

  orderStatus(id: string, status: OrderStatus) {
    return mutate("admin-order-status", { id, status })
  },

  saveProduct(values: Product) {
    return mutate("admin-product-save", values)
  },

  deleteProduct(id: string) {
    return mutate("admin-product-delete", { id })
  },

  saveCategory(values: Record<string, unknown>) { return mutate("admin-category-save", values) },
  deleteCategory(id: string) { return mutate("admin-category-delete", { id }) },

  toggleUser(id: string) {
    return mutate("admin-user-toggle", { id })
  },

  saveContent(group: CmsGroup, record: Content) {
    return mutate("admin-content-save", { group, record })
  },

  deleteContent(group: CmsGroup, id: string) {
    return mutate("admin-content-delete", { group, id })
  },

  shipping(fee: number, freeFrom: number) {
    return mutate("admin-shipping", { fee, freeFrom })
  },

  comment(articleId: string, body: string) {
    return mutate("comment", { articleId, body })
  },

  contact(name: string, email: string, body: string) {
    return mutate("contact", { name, email, body })
  },

  newsletter(email: string) {
    return mutate("newsletter", { email })
  },

  async upload(file: File) {
    if (
      file.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    )
      throw new Error("Chỉ nhận ảnh JPG, PNG, WebP tối đa 5 MB.")

    const form = new FormData()
    form.append("image", file)

    const result = await request<{ path: string }>("/api/store/admin-upload", {
      method: "POST",
      headers: { "X-CSRF-Token": memory.csrfToken },
      body: form,
    })

    await refresh()

    return result.path
  },

  async list<T,>(
    resource: string,
    parameters: Record<string, string | number | undefined> = {},
    signal?: AbortSignal,
  ): Promise<PageResult<T>> {
    const query = new URLSearchParams()

    Object.entries(parameters).forEach(([name, value]) => {
      if (value !== undefined && value !== "") query.set(name, String(value))
    })

    const data = await request<PageResult<unknown>>(
      `/api/store/list/${resource}?${query}`,
      { signal },
    )

    const convert =
      resource === "products"
        ? (item: unknown) => product(item as Product)
        : resource === "orders"
          ? (item: unknown) => order(item as Order)
          : (item: unknown) => item

    return { ...data, items: data.items.map(convert) as T[] }
  },

  async item<T,>(
    resource: string,
    id: string,
    signal?: AbortSignal,
  ): Promise<T> {
    const data = await request<unknown>(
      `/api/store/item/${resource}/${encodeURIComponent(id)}`,
      { signal },
    )

    return (
      resource === "products"
        ? product(data as Product)
        : resource === "orders"
          ? order(data as Order)
          : data
    ) as T
  },
}

export type { Order }
