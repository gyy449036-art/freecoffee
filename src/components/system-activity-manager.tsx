import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'

type PaymentEvent = { id: string; provider: string; providerEventId: string; status: string; error: string | null; receivedAt: string | Date }
type DownloadGrant = { id: string; productId: string; orderId: string; downloadCount: number; maxDownloads: number; expiresAt: string | Date; createdAt: string | Date }

const pageSize = 10

function Pager({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  return <Pagination className="mt-6"><PaginationContent>
    <PaginationItem><PaginationPrevious href="#" aria-disabled={page === 1} onClick={(event) => { event.preventDefault(); if (page > 1) onChange(page - 1) }} /></PaginationItem>
    {Array.from({ length: pageCount }, (_, index) => index + 1).map((value) => <PaginationItem key={value}><PaginationLink href="#" isActive={value === page} onClick={(event) => { event.preventDefault(); onChange(value) }}>{value}</PaginationLink></PaginationItem>)}
    <PaginationItem><PaginationNext href="#" aria-disabled={page === pageCount} onClick={(event) => { event.preventDefault(); if (page < pageCount) onChange(page + 1) }} /></PaginationItem>
  </PaginationContent></Pagination>
}

function date(value: string | Date) {
  return new Date(value).toLocaleString()
}

export function SystemActivityManager({ paymentEvents, downloadGrants }: { paymentEvents: PaymentEvent[]; downloadGrants: DownloadGrant[] }) {
  const [paymentPage, setPaymentPage] = useState(1)
  const [downloadPage, setDownloadPage] = useState(1)
  const payments = paymentEvents.slice((paymentPage - 1) * pageSize, paymentPage * pageSize)
  const downloads = downloadGrants.slice((downloadPage - 1) * pageSize, downloadPage * pageSize)

  return <div className="media-manager"><Tabs defaultValue="payments" className="w-full gap-0"><TabsList className="settings-tabs h-auto! w-full justify-start"><TabsTrigger value="payments" className="settings-tab h-auto flex-none px-4.5 py-2.5">Payment webhooks</TabsTrigger><TabsTrigger value="downloads" className="settings-tab h-auto flex-none px-4.5 py-2.5">Download grants</TabsTrigger></TabsList>
    <TabsContent value="payments"><section className="settings-card mt-0"><div className="connected-heading"><h2>Payment webhook events</h2><p>{paymentEvents.length} events, newest first.</p></div>{paymentEvents.length ? <div className="activity-list">{payments.map((event) => <div className="activity-row" key={event.id}><span><strong>{event.provider} · {event.status}</strong><small>{event.providerEventId} · {date(event.receivedAt)}</small></span><b>{event.error || 'Received'}</b></div>)}</div> : <div className="payments-empty"><h2>No webhook events</h2><p>Payment provider webhook events will appear here.</p></div>}<Pager page={paymentPage} total={paymentEvents.length} onChange={setPaymentPage} /></section></TabsContent>
    <TabsContent value="downloads"><section className="settings-card mt-0"><div className="connected-heading"><h2>Download grants</h2><p>{downloadGrants.length} grants, newest first.</p></div>{downloadGrants.length ? <div className="activity-list">{downloads.map((grant) => <div className="activity-row" key={grant.id}><span><strong>{grant.productId}</strong><small>{grant.orderId} · expires {date(grant.expiresAt)}</small></span><b>{grant.downloadCount}/{grant.maxDownloads}</b></div>)}</div> : <div className="payments-empty"><h2>No download grants</h2><p>Digital product download authorizations will appear here.</p></div>}<Pager page={downloadPage} total={downloadGrants.length} onChange={setDownloadPage} /></section></TabsContent>

  </Tabs></div>
}
