// SPEC-008 FR-017: audit trail, newest first, paged by the last id.
import React, { useEffect, useState } from 'react'
import { AuditRow, fetchAudit } from '../../adminApi'
import { formatIST } from '../../dates'
import { btn, ListState, td, th } from './ui'

const PAGE = 100

export const Audit: React.FC = () => {
  const [rows, setRows] = useState<AuditRow[]>([])
  const [more, setMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async (before?: AuditRow['id']) => {
    setLoading(true)
    setError('')
    try {
      const { items } = await fetchAudit(before)
      setRows((r) => (before === undefined ? items : [...r, ...items]))
      setMore(items.length >= PAGE)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the audit trail.')
    }
    setLoading(false)
  }
  useEffect(() => {
    void load()
  }, [])

  return (
    <section aria-labelledby="audit-h">
      <h2 id="audit-h" className="text-lg font-bold mb-3">Audit trail</h2>
      <ListState loading={loading} error={error} empty={rows.length === 0} emptyText="No admin actions recorded yet." onRetry={() => load()}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="audit-table">
            <caption className="sr-only">Admin actions, newest first</caption>
            <thead>
              <tr>
                {['Time (IST)', 'Actor', 'Action', 'Target', 'Detail'].map((h) => (
                  <th key={h} scope="col" className={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={td}>{formatIST(r.at)}</td>
                  <td className={td}>{r.actor}</td>
                  <td className={td}>{r.action}</td>
                  <td className={td}>{r.target}</td>
                  <td className={td}>{r.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {more && (
          <button type="button" className={`${btn} mt-3`} disabled={loading} onClick={() => load(rows[rows.length - 1].id)}>
            {loading ? 'Loading...' : 'Load more'}
          </button>
        )}
      </ListState>
    </section>
  )
}
