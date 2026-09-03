import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { showToast } from '@/lib/toast'

type Template = { id: string; eventKey: string; displayName: string; description: string; subject: string; bodyText: string; bodyHtml: string | null; enabled: boolean }
type Delivery = { id: string; channel: string; recipient: string; template: string; referenceId: string | null; status: string; attempts: number; lastError: string | null; createdAt: string | Date }
const pageSize = 10

function Pager({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  return <Pagination className="mt-6"><PaginationContent><PaginationItem><PaginationPrevious href="#" aria-disabled={page === 1} onClick={(event) => { event.preventDefault(); if (page > 1) onChange(page - 1) }} /></PaginationItem>{Array.from({ length: pages }, (_, i) => i + 1).map((value) => <PaginationItem key={value}><PaginationLink href="#" isActive={value === page} onClick={(event) => { event.preventDefault(); onChange(value) }}>{value}</PaginationLink></PaginationItem>)}<PaginationItem><PaginationNext href="#" aria-disabled={page === pages} onClick={(event) => { event.preventDefault(); if (page < pages) onChange(page + 1) }} /></PaginationItem></PaginationContent></Pagination>
}

export function NotificationsManager({ initialTemplates, initialDeliveries }: { initialTemplates: Template[]; initialDeliveries: Delivery[] }) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [deliveries] = useState(initialDeliveries)
  const [selected, setSelected] = useState(initialTemplates[0]?.id ?? '')
  const [page, setPage] = useState(1)
  const template = templates.find((item) => item.id === selected) ?? templates[0]
  const visibleDeliveries = deliveries.slice((page - 1) * pageSize, page * pageSize)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!template) return
    const data = new FormData(event.currentTarget)
    const body = { id: template.id, displayName: data.get('displayName'), description: data.get('description'), subject: data.get('subject'), bodyText: data.get('bodyText'), bodyHtml: data.get('bodyHtml'), enabled: data.get('enabled') === 'on' }
    const response = await fetch('/api/admin/notifications', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const result = await response.json().catch(() => ({})) as { error?: string; template?: Template }
    if (!response.ok || !result.template) { showToast(result.error || 'Unable to save template.'); return }
    setTemplates((items) => items.map((item) => item.id === result.template!.id ? result.template! : item))
    showToast('Template saved.', 'success')
  }

  return <div className="media-manager"><Tabs defaultValue="templates" className="w-full gap-0"><TabsList className="settings-tabs h-auto! w-full justify-start"><TabsTrigger value="templates" className="settings-tab h-auto flex-none px-4.5 py-2.5">Templates</TabsTrigger><TabsTrigger value="logs" className="settings-tab h-auto flex-none px-4.5 py-2.5">Delivery logs</TabsTrigger></TabsList><TabsContent value="templates"><section className="settings-card mt-0"><div className="connected-heading"><h2>Message templates</h2><p>Reusable business-event templates. Email is the active channel for now.</p></div>{template && <div className="notifications-template-layout"><nav className="notifications-template-list" aria-label="Message templates">{templates.map((item) => <button type="button" className={item.id === template.id ? 'is-selected' : ''} key={item.id} onClick={() => setSelected(item.id)}><strong>{item.displayName}</strong><small>{item.eventKey}</small></button>)}</nav><form className="profile-form" key={template.id} onSubmit={save}><label>Display name<Input name="displayName" defaultValue={template.displayName} required /></label><label>Description<Input name="description" defaultValue={template.description} /></label><label>Subject<Input name="subject" defaultValue={template.subject} required /></label><label>Text body<Textarea name="bodyText" defaultValue={template.bodyText} rows={8} required /></label><label>HTML body<Textarea name="bodyHtml" defaultValue={template.bodyHtml ?? ''} rows={5} /></label><label className="check-row"><input name="enabled" type="checkbox" defaultChecked={template.enabled} /> Enable this template</label><p className="field-help">Use variables such as <code>{'{{siteName}}'}</code>, <code>{'{{orderId}}'}</code>, <code>{'{{amount}}'}</code>, <code>{'{{currency}}'}</code>, <code>{'{{downloadLinks}}'}</code>, and <code>{'{{supporterName}}'}</code>.</p><Button type="submit">Save template</Button></form></div>}</section></TabsContent><TabsContent value="logs"><section className="settings-card mt-0"><div className="connected-heading"><h2>Delivery logs</h2><p>{deliveries.length} notification deliveries, newest first.</p></div>{deliveries.length ? <div className="activity-list">{visibleDeliveries.map((delivery) => <div className="activity-row" key={delivery.id}><span><strong>{delivery.template} · {delivery.channel}</strong><small>{delivery.recipient} · {new Date(delivery.createdAt).toLocaleString()} · {delivery.attempts} attempt{delivery.attempts === 1 ? '' : 's'}</small></span><b>{delivery.status === 'failed' ? delivery.lastError || 'Failed' : delivery.status}</b></div>)}</div> : <div className="payments-empty"><h2>No delivery logs yet</h2><p>Notification delivery attempts will appear here.</p></div>}<Pager page={page} total={deliveries.length} onChange={setPage} /></section></TabsContent></Tabs></div>
}
