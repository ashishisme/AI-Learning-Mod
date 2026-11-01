// SPEC-008 US2 + US3: seats, invites, accounts, extend. Secrets (links, passwords) live in component state only and are shown once.
import React, { useState } from 'react'
import {
  accountsCsvUrl, AccountRow, createInvites, extendAccount, extendLabel, fetchAccounts, fetchDashboard, fetchInvites,
  reissuePassword, revokeAccount, revokeInvite,
} from '../../adminApi'
import { ApiError } from '../../api'
import { formatIST } from '../../dates'
import { copyText } from '../Invite'
import { btn, Dialog, field, ListState, primary, StatusText, td, th, useLoad } from './ui'

const LABEL_RE = /^[A-Za-z0-9 _.-]*$/
const GUIDANCE = 'Use a group label such as "School A - Grade 7". Do not enter personal names.'

// Spreadsheet formula injection: a cell starting with = + - or @ gets a leading single quote.
const cell = (v: string) => `"${(/^[=+\-@]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`
export const linksCsv = (links: string[], label: string) =>
  ['link,label', ...links.map((l) => `${cell(l)},${cell(label)}`)].join('\r\n') + '\r\n'

function msg(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  return e instanceof ApiError || e instanceof Error ? e.message : fallback
}

const Months: React.FC<{ id: string; value: number; onChange: (n: number) => void }> = ({ id, value, onChange }) => (
  <>
    <label htmlFor={id} className="text-sm font-semibold">Months</label>
    <select id={id} className={field} value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
    </select>
  </>
)

// One confirm dialog for every write. run() may return a result line, which replaces the buttons with Close.
const ActionDialog: React.FC<{
  title: string; body: string; confirm: string; months?: boolean; onClose: () => void
  run: (months: number) => Promise<string | void>
}> = ({ title, body, confirm, months, onClose, run }) => {
  const [m, setM] = useState(2)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [result, setResult] = useState('')
  const go = async () => {
    setBusy(true)
    setErr('')
    try {
      const r = await run(m)
      if (typeof r === 'string') setResult(r)
      else onClose()
    } catch (e) {
      setErr(e instanceof ApiError && e.code === 'revoked' ? 'This account was revoked and cannot be extended.' : msg(e))
    }
    setBusy(false)
  }
  return (
    <Dialog title={title} onClose={onClose} testId="action-dialog">
      <p className="text-sm mb-3">{body}</p>
      {months && !result && <div className="flex items-center gap-2 mb-3"><Months id="dlg-months" value={m} onChange={setM} /></div>}
      {err && <p role="alert" data-testid="action-error" className="mb-3 text-sm font-medium text-red-800 dark:text-red-300">{err}</p>}
      {result && <p role="status" data-testid="action-result" className="mb-3 text-sm font-semibold">{result}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className={btn} onClick={onClose}>{result ? 'Close' : 'Cancel'}</button>
        {!result && <button type="button" data-testid="action-confirm" className={primary} disabled={busy} onClick={go}>{busy ? 'Working...' : confirm}</button>}
      </div>
    </Dialog>
  )
}

type Dlg =
  | { k: 'revokeInvite'; id: string }
  | { k: 'revokeAccount'; id: string }
  | { k: 'reissue'; id: string }
  | { k: 'extend'; id: string }
  | { k: 'extendGroup' }

export const UsersInvites: React.FC = () => {
  const [label, setLabel] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('lastSeen')
  const [order, setOrder] = useState('desc')
  const [dlg, setDlg] = useState<Dlg | null>(null)
  const [note, setNote] = useState('')
  const [pw, setPw] = useState('')
  const filters = { label, status, sort, order }

  const dash = useLoad(() => fetchDashboard(label), [label])
  const accounts = useLoad(() => fetchAccounts(filters), [label, status, sort, order])
  const invites = useLoad(() => fetchInvites(), [])
  const refresh = () => { dash.reload(); accounts.reload(); invites.reload() }
  const close = () => setDlg(null)

  // invite generator
  const [count, setCount] = useState('1')
  const [newLabel, setNewLabel] = useState('')
  const [formErr, setFormErr] = useState('')
  const [genBusy, setGenBusy] = useState(false)
  const [links, setLinks] = useState<{ links: string[]; label: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const generate = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = Number(count)
    if (!Number.isInteger(n) || n < 1 || n > 100) return setFormErr('Enter a number of invites from 1 to 100.')
    const l = newLabel.trim()
    if (l.length > 40) return setFormErr('The group label can be at most 40 characters.')
    if (!LABEL_RE.test(l)) return setFormErr('The group label can only use letters, digits, spaces, "-", "_" and ".".')
    setFormErr('')
    setGenBusy(true)
    try {
      const r = await createInvites(n, l)
      setLinks({ links: r.links, label: l })
      setCopied(false)
      refresh()
    } catch (err) {
      setFormErr(msg(err))
    }
    setGenBusy(false)
  }
  const downloadCsv = () => {
    if (!links) return
    const url = URL.createObjectURL(new Blob([linksCsv(links.links, links.label)], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'invite-links.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const d = dash.data
  const rows = accounts.data?.items ?? []
  const labelFilter = (
    <div className="flex items-center gap-2">
      <label htmlFor="f-label" className="text-sm font-semibold">Group label</label>
      <select id="f-label" data-testid="f-label" className={field} value={label} onChange={(e) => setLabel(e.target.value)}>
        <option value="">All labels</option>
        {(d?.labels ?? []).map((l) => <option key={l} value={l}>{l}</option>)}
      </select>
    </div>
  )
  const tiles: Array<[string, number | undefined]> = [
    ['Active accounts', d?.active], ['Expired accounts', d?.expired], ['Revoked accounts', d?.revoked],
    ['Pending invites', d?.pendingInvites], ['Expiring in 7 days', d?.expiringIn7Days],
  ]

  return (
    <div className="space-y-8">
      <section aria-labelledby="seats-h">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 id="seats-h" className="text-lg font-bold">Seats and accounts</h2>
          {labelFilter}
        </div>
        <ListState loading={dash.loading} error={dash.error} empty={!d} emptyText="No data yet." onRetry={dash.reload}>
          {d && (
            <>
              <p data-testid="seat-gauge" className="mb-1 font-semibold">Seats used: {d.seatsUsed} of {d.seatCap}</p>
              <div role="progressbar" aria-label="Seats used" aria-valuemin={0} aria-valuemax={d.seatCap} aria-valuenow={d.seatsUsed} className="h-3 rounded bg-slate-200 dark:bg-slate-700 mb-4 overflow-hidden">
                <div className="h-full bg-blue-700 dark:bg-blue-400" style={{ width: `${Math.min(100, (d.seatsUsed / Math.max(1, d.seatCap)) * 100)}%` }} />
              </div>
              <dl className="grid grid-cols-2 sm:grid-cols-5 gap-3" data-testid="tiles">
                {tiles.map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-slate-300 dark:border-slate-700 p-3">
                    <dt className="text-xs text-slate-700 dark:text-slate-300">{k}</dt>
                    <dd className="text-xl font-bold" data-testid={`tile-${k.split(' ')[0].toLowerCase()}`}>{v}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </ListState>
      </section>

      <section aria-labelledby="gen-h">
        <h2 id="gen-h" className="text-lg font-bold mb-2">Create invites</h2>
        <form onSubmit={generate} noValidate className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="gen-count" className="block text-sm font-semibold mb-1">Number of invites (1 to 100)</label>
            <input id="gen-count" data-testid="gen-count" type="number" min={1} max={100} className={`${field} w-28`} value={count} onChange={(e) => setCount(e.target.value)} />
          </div>
          <div>
            <label htmlFor="gen-label" className="block text-sm font-semibold mb-1">Group label (optional)</label>
            <input id="gen-label" data-testid="gen-label" type="text" maxLength={40} aria-describedby="gen-help" className={`${field} w-64`} value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
          </div>
          <button type="submit" data-testid="gen-submit" className={primary} disabled={genBusy}>{genBusy ? 'Creating...' : 'Create invites'}</button>
        </form>
        <p id="gen-help" data-testid="gen-help" className="mt-2 text-sm text-slate-700 dark:text-slate-300">{GUIDANCE}</p>
        {formErr && <p role="alert" data-testid="gen-error" className="mt-2 text-sm font-medium text-red-800 dark:text-red-300">{formErr}</p>}
        {links && (
          <div data-testid="links-panel" className="mt-4 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950 text-amber-950 dark:text-amber-100 p-4">
            <p className="font-semibold mb-2">These links cannot be shown again. Copy or download them now.</p>
            <textarea readOnly aria-label="Invite links" data-testid="links-text" rows={Math.min(8, links.links.length)} className={`${field} w-full font-mono text-xs py-2`} value={links.links.join('\n')} />
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <button type="button" data-testid="links-copy" className={btn} onClick={async () => { await copyText(links.links.join('\n')); setCopied(true) }}>Copy all</button>
              <button type="button" data-testid="links-csv" className={btn} onClick={downloadCsv}>Download CSV</button>
              <button type="button" className={btn} onClick={() => setLinks(null)}>Done, hide links</button>
              {copied && <span role="status">Copied.</span>}
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="inv-h">
        <h2 id="inv-h" className="text-lg font-bold mb-2">Invites</h2>
        <ListState loading={invites.loading} error={invites.error} empty={(invites.data?.items.length ?? 0) === 0} emptyText="No invites yet." onRetry={invites.reload}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="invites-table">
              <caption className="sr-only">Invites</caption>
              <thead><tr>{['ID', 'Label', 'Status', 'Created (IST)', 'Expires (IST)', 'Created by', 'Action'].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
              <tbody>
                {invites.data?.items.map((i) => (
                  <tr key={i.id}>
                    <th scope="row" className={`${td} font-mono text-left font-normal`}>{i.id}</th>
                    <td className={td}>{i.label || 'None'}</td>
                    <td className={td}><StatusText status={i.status} /></td>
                    <td className={td}>{formatIST(i.createdAt)}</td>
                    <td className={td}>{formatIST(i.expiresAt)}</td>
                    <td className={td}>{i.createdBy}</td>
                    <td className={td}>
                      {i.status === 'pending' && <button type="button" className={btn} aria-label={`Revoke invite ${i.id}`} onClick={() => setDlg({ k: 'revokeInvite', id: i.id })}>Revoke</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ListState>
      </section>

      <section aria-labelledby="acc-h">
        <h2 id="acc-h" className="text-lg font-bold mb-2">Accounts</h2>
        <div className="flex flex-wrap items-center gap-4 mb-3">
          {labelFilter}
          <div className="flex items-center gap-2">
            <label htmlFor="f-status" className="text-sm font-semibold">Status</label>
            <select id="f-status" data-testid="f-status" className={field} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option><option value="active">Active</option><option value="expired">Expired</option><option value="revoked">Revoked</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="f-sort" className="text-sm font-semibold">Sort by</label>
            <select id="f-sort" data-testid="f-sort" className={field} value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="lastSeen">Last seen</option><option value="expiry">Expiry</option><option value="activated">Activated</option>
            </select>
            <label htmlFor="f-order" className="sr-only">Order</label>
            <select id="f-order" data-testid="f-order" className={field} value={order} onChange={(e) => setOrder(e.target.value)}>
              <option value="desc">Newest first</option><option value="asc">Oldest first</option>
            </select>
          </div>
          <a data-testid="export-csv" href={accountsCsvUrl(filters)} download className={`${btn} inline-flex items-center`}>Export accounts (CSV)</a>
        </div>
        {label && (
          <div data-testid="group-extend" className="mb-3 flex items-center gap-2 flex-wrap">
            <span className="text-sm">Extend all accounts in this group</span>
            <button type="button" data-testid="group-extend-btn" className={btn} onClick={() => setDlg({ k: 'extendGroup' })}>Extend this group</button>
          </div>
        )}
        {note && <p role="status" data-testid="note" className="mb-3 text-sm font-semibold">{note}</p>}
        <ListState loading={accounts.loading} error={accounts.error} empty={rows.length === 0} emptyText="No accounts match these filters." onRetry={accounts.reload}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="accounts-table">
              <caption className="sr-only">Accounts</caption>
              <thead><tr>{['Beta ID', 'Label', 'Status', 'Activated (IST)', 'Expires (IST)', 'Last seen (IST)', 'Devices', 'Actions'].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
              <tbody>
                {rows.map((a: AccountRow) => (
                  <tr key={a.betaId}>
                    <th scope="row" className={`${td} font-mono text-left font-normal`}>{a.betaId}</th>
                    <td className={td}>{a.label || 'None'}</td>
                    <td className={td}><StatusText status={a.status} /></td>
                    <td className={td}>{formatIST(a.activatedAt)}</td>
                    <td className={td} data-testid={`expires-${a.betaId}`}>{formatIST(a.expiresAt)}</td>
                    <td className={td}>{formatIST(a.lastSeenAt)}</td>
                    <td className={td}>{a.devices}</td>
                    <td className={td}>
                      <div className="flex gap-2 flex-wrap">
                        {a.status !== 'revoked' && <button type="button" className={btn} aria-label={`Extend ${a.betaId}`} onClick={() => setDlg({ k: 'extend', id: a.betaId })}>Extend</button>}
                        {a.status !== 'revoked' && <button type="button" className={btn} aria-label={`Reissue password for ${a.betaId}`} onClick={() => setDlg({ k: 'reissue', id: a.betaId })}>Reissue password</button>}
                        {a.status !== 'revoked' && <button type="button" className={btn} aria-label={`Revoke account ${a.betaId}`} onClick={() => setDlg({ k: 'revokeAccount', id: a.betaId })}>Revoke account</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ListState>
      </section>

      {dlg?.k === 'revokeInvite' && (
        <ActionDialog title="Revoke invite?" body={`Invite ${dlg.id} will stop working and its seat is freed.`} confirm="Revoke invite" onClose={close}
          run={async () => { await revokeInvite(dlg.id); refresh() }} />
      )}
      {dlg?.k === 'revokeAccount' && (
        <ActionDialog title="Revoke account?" body={`${dlg.id} will be signed out everywhere and cannot sign in again. Its seat is freed.`} confirm="Revoke account" onClose={close}
          run={async () => { await revokeAccount(dlg.id); refresh() }} />
      )}
      {dlg?.k === 'reissue' && (
        <ActionDialog title="Reissue password?" body={`A new password is created for ${dlg.id}. The old password stops working and the learner's devices are signed out.`} confirm="Reissue password" onClose={close}
          run={async () => { const r = await reissuePassword(dlg.id); refresh(); setPw(r.password) }} />
      )}
      {dlg?.k === 'extend' && (
        <ActionDialog title={`Extend ${dlg.id}`} body="Choose how many months to add to this account." months confirm="Extend" onClose={close}
          run={async (m) => { const r = await extendAccount(dlg.id, m); refresh(); return `New expiry: ${formatIST(r.expiresAt)}` }} />
      )}
      {dlg?.k === 'extendGroup' && (
        <ActionDialog title={`Extend ${label}`} body="Every account in this group, active or expired, is extended. Revoked accounts are skipped." months confirm="Extend this group" onClose={close}
          run={async (m) => { const r = await extendLabel(label, m); refresh(); const t = `Extended ${r.extended} ${r.extended === 1 ? 'account' : 'accounts'}`; setNote(t); return t }} />
      )}
      {pw && <PasswordDialog pw={pw} onClose={() => setPw('')} />}
    </div>
  )
}

const PasswordDialog: React.FC<{ pw: string; onClose: () => void }> = ({ pw, onClose }) => {
  const [copied, setCopied] = useState(false)
  return (
    <Dialog title="New password" onClose={onClose} testId="password-dialog">
      <p data-testid="new-password" className="font-mono text-lg break-all mb-3 p-2 rounded border border-slate-400 dark:border-slate-500">{pw}</p>
      <p className="text-sm mb-3">This password is not shown again. The old password stopped working and the learner's devices were signed out.</p>
      <div className="flex gap-2 justify-end items-center">
        {copied && <span role="status" className="text-sm">Copied.</span>}
        <button type="button" data-testid="password-copy" className={btn} onClick={async () => { await copyText(pw); setCopied(true) }}>Copy</button>
        <button type="button" data-testid="password-close" className={primary} onClick={onClose}>Close</button>
      </div>
    </Dialog>
  )
}
