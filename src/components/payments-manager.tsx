import { useMemo, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Support = { id: string; displayName: string | null; anonymous: boolean; status: string; provider: string | null; amount: number; currency: string; createdAt: string | Date }
type Order = { id: string; buyerEmail: string; status: string; provider: string | null; totalAmount: number; currency: string; createdAt: string | Date }
type PaymentItem = { id: string; kind: 'tip' | 'order'; name: string; status: string; provider: string; amount: number; currency: string; createdAt: string | Date; detail: string }
const pageSize = 10

function Pager({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  return <Pagination className="mt-6"><PaginationContent><PaginationItem><PaginationPrevious href="#" aria-disabled={page === 1} onClick={(event) => { event.preventDefault(); if (page > 1) onChange(page - 1) }} /></PaginationItem>{Array.from({ length: pageCount }, (_, index) => index + 1).map((value) => <PaginationItem key={value}><PaginationLink href="#" isActive={value === page} onClick={(event) => { event.preventDefault(); onChange(value) }}>{value}</PaginationLink></PaginationItem>)}<PaginationItem><PaginationNext href="#" aria-disabled={page === pageCount} onClick={(event) => { event.preventDefault(); if (page < pageCount) onChange(page + 1) }} /></PaginationItem></PaginationContent></Pagination>
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleString()
}

export function PaymentsManager({ supports, orders }: { supports: Support[]; orders: Order[] }) {
  const [type, setType] = useState('all')
  const [page, setPage] = useState(1)
  const items = useMemo<PaymentItem[]>(() => {
    const tips: PaymentItem[] = supports.map((item) => ({ id: item.id, kind: 'tip', name: item.anonymous ? 'Anonymous supporter' : item.displayName || 'Supporter', status: item.status, provider: item.provider || 'pending', amount: item.amount, currency: item.currency, createdAt: item.createdAt, detail: 'Tip' }))
    const shopOrders: PaymentItem[] = orders.map((item) => ({ id: item.id, kind: 'order', name: item.buyerEmail, status: item.status, provider: item.provider || 'pending', amount: item.totalAmount, currency: item.currency, createdAt: item.createdAt, detail: 'Shop order' }))
    return (type === 'tips' ? tips : type === 'orders' ? shopOrders : [...tips, ...shopOrders]).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [orders, supports, type])
  const visibleItems = items.slice((page - 1) * pageSize, page * pageSize)
  const updateType = (value: string) => { setType(value); setPage(1) }

  const tab = type === 'tips' ? 'received' : type === 'orders' ? 'orders' : 'all'

  return <div className="media-manager"><Tabs value={tab} onValueChange={(value) => updateType(value === 'received' ? 'tips' : value === 'orders' ? 'orders' : 'all')} className="w-full gap-0"><TabsList className="settings-tabs h-auto! w-full justify-start"><TabsTrigger value="all" className="settings-tab h-auto flex-none px-4.5 py-2.5">All</TabsTrigger><TabsTrigger value="received" className="settings-tab h-auto flex-none px-4.5 py-2.5">Received</TabsTrigger><TabsTrigger value="orders" className="settings-tab h-auto flex-none px-4.5 py-2.5">Orders</TabsTrigger></TabsList>
    <TabsContent value={tab}><PaymentList items={visibleItems} total={items.length} page={page} onPageChange={setPage} type={type} onTypeChange={updateType} /></TabsContent>
  </Tabs></div>
}

function PaymentList({ items, total, page, onPageChange, type, onTypeChange }: { items: PaymentItem[]; total: number; page: number; onPageChange: (page: number) => void; type: string; onTypeChange: (type: string) => void }) {
  return <section className="payments-card"><div className="payments-filter"><Select value={type} onValueChange={onTypeChange}><SelectTrigger className="payments-select"><SelectValue placeholder="All" /></SelectTrigger><SelectContent position="popper" align="start" className="w-(--radix-select-trigger-width)"><SelectItem value="all">All</SelectItem><SelectItem value="tips">Tips</SelectItem><SelectItem value="orders">Shop orders</SelectItem></SelectContent></Select></div>{total ? <div className="activity-list">{items.map((item) => <div className="activity-row" key={`${item.kind}-${item.id}`}><span><strong>{item.name}</strong><small>{item.detail} · {item.status} · {item.provider} · {formatDate(item.createdAt)}</small></span><b>{(item.amount / 100).toFixed(2)} {item.currency}</b></div>)}</div> : <div className="payments-empty"><div className="empty-coffee">☕</div><h2>No payments or orders yet</h2><p>Support and shop activity will appear here.</p></div>}<Pager page={page} total={total} onChange={onPageChange} /></section>
}
