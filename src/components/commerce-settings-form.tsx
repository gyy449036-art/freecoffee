import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { showToast } from '@/lib/toast'

type ExchangeRates = {
  CNY: string
  EUR: string
  GBP: string
  JPY: string
}

export function CommerceSettingsForm({ currency: initialCurrency, taxRate, exchangeRates }: { currency: string; taxRate: string; exchangeRates: ExchangeRates }) {
  const [currency, setCurrency] = useState(initialCurrency)
  const [saving, setSaving] = useState(false)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    const data = new FormData(event.currentTarget)
    const confirmCurrencyChange = currency === initialCurrency || window.confirm('Changing currency will convert editable prices and support settings. Historical transactions will not change. Continue?')

    if (!confirmCurrencyChange) {
      setSaving(false)
      return
    }

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          currency,
          taxRate: String(data.get('taxRate') || '0'),
          exchangeRates: {
            CNY: data.get('rateCNY'),
            EUR: data.get('rateEUR'),
            GBP: data.get('rateGBP'),
            JPY: data.get('rateJPY'),
          },
          confirmCurrencyChange,
        }),
      })
      const result = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) {
        showToast(result.error || 'Unable to save commerce settings.')
        return
      }
      showToast('Commerce settings saved.', 'success')
    } catch {
      showToast('Unable to reach the settings service. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return <form onSubmit={save}>
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="commerce-currency">Currency</FieldLabel>
        <NativeSelect id="commerce-currency" className="w-full [&_select]:h-[45px]" value={currency} onChange={(event) => setCurrency(event.target.value)}>
          <NativeSelectOption value="USD">USD</NativeSelectOption><NativeSelectOption value="CNY">CNY</NativeSelectOption><NativeSelectOption value="EUR">EUR</NativeSelectOption><NativeSelectOption value="GBP">GBP</NativeSelectOption><NativeSelectOption value="JPY">JPY</NativeSelectOption>
        </NativeSelect>
      </Field>
      <Field>
        <FieldLabel htmlFor="commerce-tax-rate">Tax rate (%)</FieldLabel>
        <Input id="commerce-tax-rate" name="taxRate" type="number" min="0" max="100" step="0.01" defaultValue={taxRate} />
        <FieldDescription>A single manual tax rate applies to new orders. Confirm your local tax obligations.</FieldDescription>
      </Field>
      <Field><FieldLabel htmlFor="rate-cny">USD to CNY</FieldLabel><Input id="rate-cny" name="rateCNY" defaultValue={exchangeRates.CNY} placeholder="7.20" /></Field>
      <Field><FieldLabel htmlFor="rate-eur">USD to EUR</FieldLabel><Input id="rate-eur" name="rateEUR" defaultValue={exchangeRates.EUR} placeholder="0.92" /></Field>
      <Field><FieldLabel htmlFor="rate-gbp">USD to GBP</FieldLabel><Input id="rate-gbp" name="rateGBP" defaultValue={exchangeRates.GBP} placeholder="0.79" /></Field>
      <Field><FieldLabel htmlFor="rate-jpy">USD to JPY</FieldLabel><Input id="rate-jpy" name="rateJPY" defaultValue={exchangeRates.JPY} placeholder="150" /></Field>
      <Button className="w-full sm:w-auto" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save commerce settings'}</Button>
    </FieldGroup>
  </form>
}
