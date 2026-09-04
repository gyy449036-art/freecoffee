import { useEffect, useState, type FormEvent } from 'react'
import { Ellipsis, Pencil, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { showToast } from '@/lib/toast'

export type ShopProduct = { id: string; name: string; description: string | null; coverImageUrl: string | null; price: number; currency: string; status: string }

type Props = { products: ShopProduct[]; currency: string }
type ProductValues = { name: string; description: string; price: string; coverImageUrl: string; file: File | null }

function displayPrice(product: ShopProduct) {
  return `${(product.price / (product.currency === 'JPY' ? 1 : 100)).toFixed(product.currency === 'JPY' ? 0 : 2)} ${product.currency}`
}

export function ShopProductsManager({ products, currency }: Props) {
  const [items, setItems] = useState(products)
  const [editing, setEditing] = useState<ShopProduct | null>(null)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)

  async function save(values: ProductValues) {
    setBusy(true)
    try {
      const response = await fetch('/api/admin/products', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...(editing ? { id: editing.id } : { status: 'draft' }), name: values.name, description: values.description, price: values.price, coverImageUrl: values.coverImageUrl }),
      })
      const result = await response.json().catch(() => ({})) as { error?: string; product?: ShopProduct }
      if (!response.ok || !result.product) throw new Error(result.error || 'Unable to save product.')

      if (values.file) {
        const files = new FormData()
        files.set('productId', result.product.id)
        files.set('file', values.file)
        const upload = await fetch('/api/admin/files', { method: 'POST', body: files })
        const uploadResult = await upload.json().catch(() => ({})) as { error?: string }
        if (!upload.ok) throw new Error(uploadResult.error || 'Product saved, but the download file could not be uploaded.')
      }

      setItems((current) => editing ? current.map((item) => item.id === result.product!.id ? result.product! : item) : [result.product!, ...current])
      setEditing(null)
      setCreating(false)
      showToast(editing ? 'Product updated.' : 'Product saved as draft.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to save product.')
    } finally {
      setBusy(false)
    }
  }

  async function changeStatus(product: ShopProduct) {
    const status = product.status === 'published' ? 'draft' : 'published'
    setBusy(true)
    try {
      const response = await fetch('/api/admin/products', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: product.id, status }) })
      const result = await response.json().catch(() => ({})) as { error?: string; product?: ShopProduct }
      if (!response.ok || !result.product) throw new Error(result.error || 'Unable to update product status.')
      setItems((current) => current.map((item) => item.id === product.id ? result.product! : item))
      showToast(status === 'published' ? 'Product published.' : 'Product moved to draft.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update product status.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(product: ShopProduct) {
    if (!window.confirm(`Delete ${product.name}?`)) return
    setBusy(true)
    try {
      const response = await fetch('/api/admin/products', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: product.id }) })
      const result = await response.json().catch(() => ({})) as { error?: string; status?: string }
      if (!response.ok) throw new Error(result.error || 'Unable to delete product.')
      setItems((current) => result.status === 'archived' ? current.map((item) => item.id === product.id ? { ...item, status: 'archived' } : item) : current.filter((item) => item.id !== product.id))
      showToast(result.status === 'archived' ? 'Product archived because it has orders.' : 'Product deleted.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to delete product.')
    } finally {
      setBusy(false)
    }
  }

  return <>
    <div className="shop-card-heading"><div><h2>Products</h2><p>Create, price, and publish the digital items in your shop.</p></div><Button className="dark-button" type="button" onClick={() => setCreating(true)}><Plus size={16} /> Add product</Button></div>
    {items.length ? <div className="product-list">{items.map((product) => <article className="product-row" key={product.id}>
      <div className="product-thumb">{product.coverImageUrl ? <img src={product.coverImageUrl} alt="" /> : <ShoppingBag size={22} />}</div>
      <div className="product-copy"><strong>{product.name}</strong><span>Digital download</span><small>{displayPrice(product)}</small></div>
      <span className={`product-status product-status-${product.status}`}>{product.status}</span>
      <div className="product-actions"><Button type="button" variant="outline" onClick={() => setEditing(product)} disabled={busy}><Pencil size={14} /> Edit</Button><DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" aria-label={`More options for ${product.name}`}><Ellipsis size={17} /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => void changeStatus(product)}>{product.status === 'published' ? 'Unpublish' : 'Publish'}</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={() => void remove(product)}><Trash2 size={14} /> Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
    </article>)}</div> : <div className="payments-empty"><div className="empty-coffee"><ShoppingBag size={24} /></div><h2>No products yet</h2><p>Create a product to start selling digital downloads.</p></div>}
    <ProductEditor open={creating || !!editing} product={editing} currency={currency} busy={busy} onOpenChange={(open) => { if (!open) { setCreating(false); setEditing(null) } }} onSubmit={save} />
  </>
}

function ProductEditor({ open, product, currency, busy, onOpenChange, onSubmit }: { open: boolean; product: ShopProduct | null; currency: string; busy: boolean; onOpenChange: (open: boolean) => void; onSubmit: (values: ProductValues) => Promise<void> }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [downloadFile, setDownloadFile] = useState<File | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(product?.name ?? '')
    setDescription(product?.description ?? '')
    setPrice(product ? String(product.price / (product.currency === 'JPY' ? 1 : 100)) : '')
    setCoverImageUrl(product?.coverImageUrl ?? '')
    setCoverFile(null)
    setDownloadFile(null)
  }, [open, product])

  async function uploadCover() {
    if (!coverFile) return coverImageUrl
    setUploadingCover(true)
    try {
      const form = new FormData()
      form.set('file', coverFile)
      form.set('folder', 'product-covers')
      const response = await fetch('/api/admin/media', { method: 'PUT', body: form })
      const result = await response.json().catch(() => ({})) as { error?: string; file?: { publicUrl?: string } }
      if (!response.ok || !result.file?.publicUrl) throw new Error(result.error || 'Unable to upload cover image.')
      setCoverImageUrl(result.file.publicUrl)
      setCoverFile(null)
      return result.file.publicUrl
    } finally {
      setUploadingCover(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !Number.isFinite(Number(price)) || Number(price) < 0) { showToast('Enter a product name and a valid price.'); return }
    try {
      const uploadedCoverUrl = await uploadCover()
      await onSubmit({ name: name.trim(), description: description.trim(), price, coverImageUrl: uploadedCoverUrl, file: downloadFile })
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to save product.')
    }
  }

  const previewUrl = coverFile ? URL.createObjectURL(coverFile) : coverImageUrl
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{product ? 'Edit product' : 'Create a product'}</DialogTitle><DialogDescription>Configure the product buyers see and the file they receive after checkout.</DialogDescription></DialogHeader><form className="flex flex-col gap-5" onSubmit={(event) => void submit(event)}>
    <FieldGroup><Field><FieldLabel htmlFor="shop-product-name">Name</FieldLabel><FieldDescription>Use a clear title and explain what the buyer receives.</FieldDescription><Input id="shop-product-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={160} placeholder="Product name" /></Field><Field><FieldLabel htmlFor="shop-product-description">Description</FieldLabel><Textarea id="shop-product-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} maxLength={5000} placeholder="Describe your digital product" /></Field><Field><FieldLabel htmlFor="shop-product-cover">Cover image</FieldLabel><FieldDescription>Shown on your public shop and product page. Recommended ratio: 1:1.</FieldDescription><div className="grid aspect-square max-w-64 place-items-center overflow-hidden rounded-lg border border-dashed bg-muted/40">{previewUrl ? <img src={previewUrl} alt="Cover preview" className="size-full object-cover" /> : <ShoppingBag className="size-8 text-muted-foreground/60" />}</div><Input id="shop-product-cover" type="file" accept="image/*" onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)} />{(coverFile || coverImageUrl) && <Button type="button" variant="ghost" size="sm" onClick={() => { setCoverFile(null); setCoverImageUrl('') }}><X data-icon="inline-start" /> Remove</Button>}</Field><Field><FieldLabel htmlFor="shop-product-download">Digital download</FieldLabel><FieldDescription>{downloadFile ? downloadFile.name : product ? 'Choose a file to replace the current download. Products with paid orders cannot replace their download.' : 'Upload the file buyers receive. You can publish after it is uploaded.'}</FieldDescription><Input id="shop-product-download" type="file" onChange={(event) => setDownloadFile(event.target.files?.[0] ?? null)} /></Field><Field><FieldLabel htmlFor="shop-product-price">Amount ({product?.currency ?? currency})</FieldLabel><FieldDescription>Set the one-time amount buyers will pay.</FieldDescription><Input id="shop-product-price" value={price} onChange={(event) => setPrice(event.target.value)} type="number" min={0} step={(product?.currency ?? currency) === 'JPY' ? 1 : 0.01} placeholder={(product?.currency ?? currency) === 'JPY' ? '1000' : '10.00'} /></Field></FieldGroup>
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy || uploadingCover}>Cancel</Button><Button className="dark-button" type="submit" disabled={busy || uploadingCover}>{busy || uploadingCover ? 'Saving...' : product ? 'Save changes' : 'Save draft'}</Button></div>
  </form></DialogContent></Dialog>
}
