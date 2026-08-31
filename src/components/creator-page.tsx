import { useMemo, useState } from 'react'
import { Coffee, ExternalLink, GitBranch, Globe, Heart, LockKeyhole, MessageCircle, Send, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Supporter = { name: string; cups: number; message: string; time: string }
type CurrentUser = { name: string; email: string }

const supporters: Supporter[] = [
  { name: 'Sarah Chen', cups: 3, message: 'Thanks for the awesome CLI tool!', time: '2 hours ago' },
  { name: 'Anonymous', cups: 1, message: 'Keep up the great work.', time: '1 day ago' },
  { name: 'Diego R.', cups: 5, message: 'Your open-source work makes a difference.', time: '3 days ago' },
]

const tabs = ['About', 'Gallery', 'Posts', 'Shop']

export function CreatorPage({ currentUser }: { currentUser: CurrentUser | null }) {
  const [tab, setTab] = useState('About')
  const [cups, setCups] = useState(1)
  const [customAmount, setCustomAmount] = useState('')
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const amount = useMemo(() => {
    const value = Number(customAmount)
    return customAmount && Number.isFinite(value) && value > 0 ? value : cups * 5
  }, [cups, customAmount])

  function chooseCups(value: number) {
    setCups(value)
    setCustomAmount('')
  }

  function submitSupport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between px-4">
          <a href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Coffee className="size-4" /></span>
            FreeCoffee<span className="text-primary">.bio</span>
          </a>
          <nav className="flex items-center gap-3 text-sm text-muted-foreground">
            <a className="hidden hover:text-foreground sm:block" href="/">What is FreeCoffee?</a>
            {currentUser ? <button className="hover:text-foreground" type="button" onClick={(event) => { const button = event.currentTarget; button.disabled = true; button.textContent = 'Signing out…'; window.location.href = '/api/auth/logout' }}>Sign out</button> : <a className="hover:text-foreground" href="/login">Sign in</a>}
            <Button asChild size="sm"><a href="/#create">Create your page <ExternalLink data-icon="inline-end" /></a></Button>
          </nav>
        </div>
      </header>

      <section className="border-b bg-background">
        <div className="h-40 bg-[linear-gradient(135deg,var(--color-teal-100),var(--color-lime-100))] sm:h-52" />
        <div className="mx-auto grid max-w-5xl gap-5 px-4 pb-7 sm:grid-cols-[112px_1fr_auto] sm:items-end sm:gap-6">
          <div className="-mt-14 grid size-24 place-items-center rounded-full border-8 border-background bg-primary text-4xl font-semibold text-primary-foreground shadow sm:size-28">A</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-semibold tracking-tight">Alex Morgan</h1><span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">Creator</span></div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">@alex · open-source developer</p>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">Building thoughtful tools for the web. Making small software, writing about it, and keeping the internet a little more human.</p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground"><a className="inline-flex items-center gap-1 hover:text-foreground" href="https://github.com" target="_blank" rel="noreferrer"><GitBranch className="size-3.5" /> GitHub</a><a className="inline-flex items-center gap-1 hover:text-foreground" href="https://alexmorgan.dev" target="_blank" rel="noreferrer"><Globe className="size-3.5" /> alexmorgan.dev</a></div>
          </div>
          <div className="flex gap-2"><Button variant="outline" size="icon" aria-label="Share creator page"><Share2 /></Button><Button variant="outline" size="icon" aria-label="More options">•••</Button></div>
        </div>
        <div className="mx-auto flex max-w-5xl gap-6 overflow-x-auto px-4" role="tablist" aria-label="Creator page sections">{tabs.map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`min-h-11 shrink-0 border-b-2 px-1 text-sm ${tab === item ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground'}`}>{item}{item === 'Posts' && <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">4</span>}</button>)}</div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-5 px-4 py-6 lg:grid-cols-[1.08fr_.92fr] lg:items-start">
        <div className="space-y-5">
          {tab === 'About' && <>
            <section className="rounded-xl border bg-card p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">About Alex</h2><Heart className="size-4 text-primary" /></div><div className="space-y-3 text-sm leading-6 text-muted-foreground"><p>I make open-source tools that help people work with less friction. My latest project is a tiny, privacy-first writing app for people who think better away from the noise.</p><p>When I am not coding, I am probably walking somewhere with a notebook. If my work has been useful to you, a coffee keeps the next experiment moving.</p></div><div className="mt-5 flex flex-wrap gap-2">{['Open source', 'Indie developer', 'Privacy'].map((tag) => <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-[10px] text-muted-foreground" key={tag}>{tag}</span>)}</div></section>
            <section className="rounded-xl border bg-card p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Selected work</h2><button className="text-xs text-primary" onClick={() => setTab('Gallery')} type="button">View gallery →</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="flex min-h-32 flex-col justify-end rounded-lg bg-cyan-100 p-4"><strong className="text-2xl tracking-tight">quietly</strong><span className="mt-1 text-xs text-muted-foreground">A calmer writing space</span></div><div className="flex min-h-32 flex-col justify-end rounded-lg bg-amber-100 p-4"><strong className="text-2xl tracking-tight">tiny tools</strong><span className="mt-1 text-xs text-muted-foreground">Useful software, carefully made</span></div></div></section>
          </>}
          {tab === 'Gallery' && <Placeholder title="Gallery" text="A focused collection of Alex's projects and experiments will live here." />}
          {tab === 'Posts' && <section className="rounded-xl border bg-card p-5 shadow-sm"><p className="font-mono text-xs text-muted-foreground">Alex Morgan · 5 days ago</p><h2 className="mt-5 text-xl font-semibold">Small software, made with care</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">I'm building in public: fewer features, more attention to the details that make tools feel good to use. The first beta is coming soon.</p><Button variant="link" className="mt-3 px-0">Read the update →</Button></section>}
          {tab === 'Shop' && <Placeholder title="Shop" text="No products yet. Check back soon for small digital tools and resources." />}
          <section className="rounded-xl border bg-card p-5 shadow-sm"><div className="flex items-start justify-between"><div><h2 className="text-lg font-semibold">Recent supporters</h2><p className="mt-1 text-xs text-muted-foreground">A little kindness goes a long way.</p></div><span className="rounded-full bg-muted px-2 py-1 font-mono text-xs">{supporters.length}</span></div><div className="mt-4 divide-y">{supporters.map((supporter) => <div className="flex gap-3 py-4 first:pt-0 last:pb-0" key={supporter.name + supporter.time}><span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-sm text-primary">{supporter.name === 'Anonymous' ? '?' : supporter.name[0]}</span><div className="min-w-0 text-sm"><p className="text-muted-foreground"><strong className="text-foreground">{supporter.name}</strong> sent {supporter.cups} {supporter.cups === 1 ? 'coffee' : 'coffees'}</p><p className="mt-1">“{supporter.message}”</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{supporter.time}</p></div><Coffee className="ml-auto size-4 shrink-0 text-primary" /></div>)}</div></section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-5">
          <form className="rounded-xl border bg-card p-5 shadow-sm" onSubmit={submitSupport}><div className="flex items-start justify-between"><div><p className="flex items-center gap-1.5 font-mono text-xs text-primary"><Coffee className="size-3.5" /> Support Alex</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Buy a coffee</h2></div><span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 font-mono text-[10px] text-primary"><LockKeyhole className="size-3" /> direct</span></div><p className="mt-3 text-sm text-muted-foreground">Keep the next idea moving with a one-time tip.</p>{currentUser && <p className="mt-2 text-xs text-muted-foreground">Supporting as {currentUser.name}</p>}<div className="mt-6 space-y-4"><fieldset><legend className="mb-2 text-xs font-medium">Choose amount</legend><div className="grid grid-cols-3 gap-2">{[1, 3, 5].map((value) => <button type="button" key={value} onClick={() => chooseCups(value)} className={`flex h-11 items-center justify-center gap-1.5 rounded-lg border text-sm ${cups === value && !customAmount ? 'border-primary bg-primary/5 text-primary' : 'hover:border-primary'}`} aria-pressed={cups === value && !customAmount}><Coffee className="size-3.5" />{value}</button>)}</div><div className="mt-2 flex items-center rounded-lg border px-3"><span className="text-muted-foreground">$</span><input className="h-11 w-full bg-transparent px-2 text-sm outline-none" type="number" min="1" max="1000" step="1" placeholder={`${cups * 5}.00`} value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} aria-label="Custom amount" /></div></fieldset><label className="block text-xs font-medium">Your name <span className="font-normal text-muted-foreground">optional</span><input className="mt-2 h-11 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:border-primary" placeholder="How should we call you?" value={name} onChange={(event) => setName(event.target.value)} /></label><label className="block text-xs font-medium">Message <span className="font-normal text-muted-foreground">optional</span><textarea className="mt-2 w-full resize-y rounded-lg border bg-transparent p-3 text-sm outline-none focus:border-primary" rows={3} maxLength={240} placeholder="Say something nice..." value={message} onChange={(event) => setMessage(event.target.value)} /></label><label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} /> Show me as anonymous</label>{submitted ? <div className="rounded-lg bg-primary/10 p-3 text-sm text-primary" role="status"><strong>Thanks for supporting Alex!</strong><p className="mt-1 text-xs">This demo stops before payment. Stripe Checkout will connect here.</p><button type="button" className="mt-2 underline" onClick={() => setSubmitted(false)}>Support again</button></div> : <Button className="w-full" size="lg" type="submit"><span className="flex-1 text-left">Support Alex</span>${amount.toFixed(2)}<Send data-icon="inline-end" /></Button>}<p className="text-center font-mono text-[10px] text-muted-foreground">Provider fees may apply.</p></div></form><div className="flex gap-2 rounded-xl bg-primary/5 p-4 text-xs text-muted-foreground"><LockKeyhole className="size-4 shrink-0 text-primary" /><p><strong className="text-foreground">Direct support.</strong> FreeCoffee takes 0% platform fees. Support goes to the creator's configured account.</p></div>
        </aside>
      </div>
      <footer className="border-t bg-background"><div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-3 px-4 py-5 font-mono text-[10px] text-muted-foreground"><span>FreeCoffee<span className="text-primary">.bio</span></span><span>Creator-owned support, made simple.</span><a href="/privacy">Privacy</a></div></footer>
    </main>
  )
}

function Placeholder({ title, text }: { title: string; text: string }) {
  return <section className="grid min-h-56 place-items-center rounded-xl border bg-card p-5 text-center shadow-sm"><div><MessageCircle className="mx-auto size-8 text-primary" /><h2 className="mt-3 text-lg font-semibold">{title}</h2><p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p></div></section>
}
