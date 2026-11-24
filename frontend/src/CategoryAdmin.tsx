import { useState } from "react"
import { Button, Modal, SelectField } from "@figma/astraui"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { InputField } from "./fields"
import { useShop } from "./shop-context"
import { useRemoteList } from "./useRemoteData"
import { api } from "./service"
import { Title } from "./ui"
import RemotePager from "./RemotePager"
import { Table, TableHeader, TableBody, TableRow, TableCell } from "./tailadmin/Table"

type CategoryRecord = { id: string; name: string; slug: string; short_name: string; detail: string; status: string; sort_order: number; productCount?: number }
const blank: CategoryRecord = { id: "", name: "", slug: "", short_name: "", detail: "", status: "active", sort_order: 0 }

export default function CategoryAdmin() {
  const { act, busy } = useShop()
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<CategoryRecord | null>(null)
  const [deleting, setDeleting] = useState<CategoryRecord | null>(null)
  const remote = useRemoteList<CategoryRecord>("categories", { admin: 1, q: query, page })
  function field(key: keyof CategoryRecord, value: string | number) { setEditing(record => record ? { ...record, [key]: value } : null) }
  return <>
    <Title sub="Phân loại sản phẩm và quản lý hiển thị trên cửa hàng." action={<Button iconStart={<Plus size={16} />} onClick={() => setEditing({ ...blank })}>Thêm danh mục</Button>}>Danh mục sản phẩm</Title>
    <section className="surface">
      <InputField label="Tìm danh mục" value={query} onChange={value => { setQuery(value); setPage(1) }} />
      <div className="table-scroll"><Table className="data-table">
        <TableHeader><TableRow>{["Danh mục", "Slug", "Sản phẩm", "Trạng thái", "Thứ tự", "Thao tác"].map(label => <TableCell key={label} isHeader>{label}</TableCell>)}</TableRow></TableHeader>
        <TableBody>{remote.items.map(record => <TableRow key={record.id}>
          <TableCell><strong>{record.name}</strong><small>{record.short_name}</small></TableCell>
          <TableCell>{record.slug}</TableCell><TableCell>{record.productCount}</TableCell>
          <TableCell>{record.status === "active" ? "Hiển thị" : "Đang ẩn"}</TableCell><TableCell>{record.sort_order}</TableCell>
          <TableCell><div className="flex gap-md"><Button variant="subtle" aria-label={`Sửa ${record.name}`} onClick={() => setEditing({ ...record })}><Pencil size={16} /></Button><Button variant="subtle" aria-label={`Xóa ${record.name}`} onClick={() => setDeleting(record)}><Trash2 size={16} /></Button></div></TableCell>
        </TableRow>)}</TableBody>
      </Table></div>
      {!remote.items.length && !remote.loading && !remote.error && <p>Không tìm thấy danh mục.</p>}
      <RemotePager pagination={remote.pagination} onPage={setPage} loading={remote.loading} error={remote.error} />
    </section>
    <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Sửa danh mục" : "Thêm danh mục"} className="tz-modal">
      {editing && <form className="form-stack" onSubmit={event => {
        event.preventDefault()
        void act(async () => {
          if (editing.name.trim().length < 2 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(editing.slug)) throw new Error("Nhập tên và slug hợp lệ.")
          await api.saveCategory(editing); setEditing(null)
        }, "Đã lưu danh mục.")
      }}>
        <InputField label="Tên danh mục" required minLength={2} maxLength={150} value={editing.name} onChange={v => field("name",v)} />
        <InputField label="Slug" required maxLength={180} pattern="[a-z0-9]+(-[a-z0-9]+)*" description="Chữ thường, số và dấu gạch ngang. Đổi slug sẽ đổi đường dẫn bộ lọc." value={editing.slug} onChange={v => field("slug",v)} />
        <InputField label="Tên ngắn" maxLength={100} value={editing.short_name} onChange={v => field("short_name",v)} />
        <InputField label="Mô tả ngắn" maxLength={255} value={editing.detail} onChange={v => field("detail",v)} />
        <InputField label="Thứ tự" type="number" min={0} max={100000} step={1} required value={String(editing.sort_order)} onChange={v => field("sort_order",Number(v))} />
        <SelectField label="Trạng thái" value={editing.status} onChange={v => field("status",v)} options={[{value:"active",label:"Hiển thị"},{value:"hidden",label:"Ẩn"}]} />
        <Button type="submit" disabled={busy}>Lưu danh mục</Button>
      </form>}
    </Modal>
    <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="Xóa danh mục?" className="tz-modal">
      <p>Danh mục “{deleting?.name}” chỉ xóa được khi không chứa sản phẩm hoặc danh mục con. Bạn có thể ẩn danh mục để giữ dữ liệu.</p>
      <div className="form-actions"><Button variant="neutral" onClick={() => setDeleting(null)}>Hủy</Button><Button disabled={busy} onClick={() => void act(async () => { await api.deleteCategory(String(deleting!.id)); setDeleting(null) }, "Đã xóa danh mục.")}>Xác nhận xóa</Button></div>
    </Modal>
  </>
}
