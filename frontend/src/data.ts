export type Role = "MEMBER" | "ADMIN"

export type Category = {
  id: string
  name: string
  short: string
  detail: string
}

export type Product = {
  sku?: string
  slug?: string
  description?: string
  images?: string[]
  id: string

  name: string

  brand: string

  category: string

  price: number

  oldPrice: number

  stock: number

  image: string

  specs: string[]

  featured: boolean

  status?: string
}

export type User = {
  id: string

  name: string

  email: string

  role: Role

  phone: string

  address: string

  active: boolean

  orderCount?: number
}

export type OrderStatus = "pending" | "confirmed" | "shipping" | "completed" | "cancelled"

export type Order = {
  id: string

  number?: string

  userId: string

  name: string

  phone: string

  address: string

  note: string

  items: {
    productId: string
    name: string
    price: number
    quantity: number
    image: string
  }[]

  subtotal: number

  discount: number

  shipping: number

  total: number

  status: OrderStatus

  createdAt: string
}

export const cmsGroups = {
  articles: "Bài viết",
  comments: "Bình luận",
  contacts: "Liên hệ",
  faqs: "Câu hỏi thường gặp",

  company: "Thông tin công ty",
  services: "Dịch vụ",
  pricing: "Bảng giá dịch vụ",

  settings: "Cài đặt website",
  media: "Thư viện media",
} as const

export type CmsGroup = keyof typeof cmsGroups

export type Content = {
  id: string

  title: string

  body: string

  extra: string

  image: string

  status: "published" | "pending" | "hidden" | "new" | "read" | "resolved"

  createdAt: string

  userId?: string
}

export type Metrics = {
  products: number
  lowStock: number
  orders: number
  pendingOrders: number
  revenue: number

  members: number
  subscribers: number
  unreadContacts: number
  pendingComments: number

  days: {
    date: string
    count: number
  }[]
}

export type Database = {
  version: number

  categories: Category[]

  brands: string[]

  articleSections: string[]

  products: Product[]

  users: User[]

  orders: Order[]

  carts: Record<string, {
    productId: string
    quantity: number
  }[]>

  favorites: Record<string, string[]>

  content: Record<CmsGroup, Content[]>

  shipping: {
    fee: number
    freeFrom: number
  }

  coupons: {
    code: string
    basisPoints: number
    maxDiscount: number
  }[]

  subscribers: string[]

  session: string | null

  csrfToken: string

  metrics: Metrics

  ready: boolean

  error: string | null

  revision: number
}

export type Pagination = {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export type PageResult<T> = {
  items: T[]
  pagination: Pagination
}

export const money = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value) + "₫"

export const orderLabels: Record<OrderStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
}

export function createEmptyState(): Database {
  return {
    version: 2,
    categories: [],
    brands: [],
    articleSections: [],
    products: [],
    users: [],
    orders: [],
    carts: {},
    favorites: {},

    content: {
      articles: [],
      comments: [],
      contacts: [],
      faqs: [],
      company: [],
      services: [],
      pricing: [],
      settings: [],
      media: [],
    },

    shipping: { fee: 0, freeFrom: 0 },
    coupons: [],
    subscribers: [],
    session: null,
    csrfToken: "",

    metrics: {
      products: 0,
      lowStock: 0,
      orders: 0,
      pendingOrders: 0,
      revenue: 0,
      members: 0,
      subscribers: 0,
      unreadContacts: 0,
      pendingComments: 0,
      days: [],
    },

    ready: false,
    error: null,
    revision: 0,
  }
}
