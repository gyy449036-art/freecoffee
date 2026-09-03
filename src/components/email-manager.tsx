import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { showToast } from '@/lib/toast'

type EmailSettings = { host: string; port: number; username: string; secure: boolean; fromAddress: string; replyTo: string | null; enabled: boolean }

export function EmailManager({ initialSettings }: { initialSettings: EmailSettings | null }) {
  const [settings, setSettings] = useState(initialSettings)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [password, setPassword] = useState('')


  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    const data = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/admin/email', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ host: data.get('host'), port: data.get('port'), username: data.get('username'), password, fromAddress: data.get('fromAddress'), replyTo: data.get('replyTo'), secure: data.get('secure') === 'on', enabled: data.get('enabled') === 'on' }) })
      const result = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) { showToast(result.error || 'Unable to save email settings.'); return }
      setSettings({ host: String(data.get('host')), port: Number(data.get('port')), username: String(data.get('username') || ''), secure: data.get('secure') === 'on', fromAddress: String(data.get('fromAddress')), replyTo: String(data.get('replyTo') || '') || null, enabled: data.get('enabled') === 'on' })
      setPassword('')
      showToast('Email settings saved.', 'success')
    } catch { showToast('Unable to reach the email service. Please try again.') } finally { setSaving(false) }
  }

  async function test(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTesting(true)
    const to = new FormData(event.currentTarget).get('to')
    try {
      const response = await fetch('/api/admin/email-test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ to }) })
      const result = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) { showToast(result.error || 'Unable to send test email.'); return }
      showToast('Test email sent.', 'success')
    } catch { showToast('Unable to reach the email service. Please try again.') } finally { setTesting(false) }
  }

  return <div className="media-manager">
    <Tabs defaultValue="configuration" className="w-full gap-0">
      <TabsList className="settings-tabs h-auto! w-full justify-start">
        <TabsTrigger value="configuration" className="settings-tab h-auto flex-none px-4.5 py-2.5 data-[state=active]:bg-(--admin-panel) data-[state=active]:shadow-[0_1px_3px_oklch(0.25_0_0/0.15)]">Configuration</TabsTrigger>
      </TabsList>
      <TabsContent value="configuration">
        <section className="settings-card mt-0"><div className="connected-heading"><h2>Email delivery</h2><p>Configure SMTP delivery for receipts and creator notifications.</p></div>
          <form className="profile-form" onSubmit={save}>
            <label>SMTP host<Input name="host" defaultValue={settings?.host ?? ''} placeholder="smtp.example.com" required /></label>
            <label>Port<Input name="port" type="number" min="1" max="65535" defaultValue={settings?.port ?? 587} required /></label>
            <label>Username<Input name="username" defaultValue={settings?.username ?? ''} /></label>
            <label>Password<Input name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={settings ? 'Saved — leave blank to keep it' : 'Required'} /><span className="field-help">{settings ? 'A password is already saved. Leave this field blank to keep it, or enter a new password to replace it.' : 'Enter the password for your SMTP account.'}</span></label>
            <label>From address<Input name="fromAddress" type="email" defaultValue={settings?.fromAddress ?? ''} placeholder="receipts@example.com" required /></label>
            <label>Reply-to address<Input name="replyTo" type="email" defaultValue={settings?.replyTo ?? ''} placeholder="support@example.com" /></label>
            <label className="check-row"><input name="secure" type="checkbox" defaultChecked={settings?.secure ?? true} /> Use TLS</label>
            <label className="check-row"><input name="enabled" type="checkbox" defaultChecked={settings?.enabled ?? false} /> Enable email delivery</label>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save email settings'}</Button>
          </form>
          <form className="profile-form mt-6" onSubmit={test}><div className="connected-heading"><h2>Send a test email</h2><p>Verify the saved SMTP configuration without creating a customer notification.</p></div><label>Test recipient<Input name="to" type="email" placeholder="you@example.com" required /></label><Button type="submit" variant="outline" disabled={testing}>{testing ? 'Sending...' : 'Send test email'}</Button></form>
        </section>
      </TabsContent>

    </Tabs>
  </div>
}
