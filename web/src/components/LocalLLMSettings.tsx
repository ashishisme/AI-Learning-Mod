// SPEC: SPEC-008 FR-021, FR-021a
import React from 'react'
import { AISettings } from '../store'
import { isLocalLLMUrl } from '../api'
import { useT } from '../i18n'

interface Props {
  form: AISettings
  setForm: (f: AISettings) => void
  models?: string[]
  testing: boolean
  onTest: () => void
}

const input =
  'w-full min-h-11 px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono'

// Hosted sites cannot reach a learner's computer, so the browser talks to the learner's own AI.
export const LocalLLMSettings: React.FC<Props> = ({ form, setForm, models, testing, onTest }) => {
  const t = useT()
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const badUrl = !!form.localLLMEnabled && !isLocalLLMUrl(form.baseUrl)

  return (
    <section aria-labelledby="local-llm-h" className="p-4 rounded-xl border border-slate-800 bg-slate-800/30 flex flex-col gap-3 text-xs">
      <div>
        <h3 id="local-llm-h" className="font-semibold text-sm text-slate-200">{t('settings.local.title')}</h3>
        <p data-testid="settings-hosted-note" className="text-[11px] text-slate-400 mt-1">
          {t('settings.local.note')}
        </p>
      </div>

      <label className="flex items-center gap-3 min-h-11 cursor-pointer text-slate-200 font-medium">
        <input
          type="checkbox"
          id="local-llm-enabled"
          checked={!!form.localLLMEnabled}
          onChange={(e) => setForm({ ...form, localLLMEnabled: e.target.checked })}
          className="w-5 h-5 accent-indigo-500"
        />
        {t('settings.local.enable')}
      </label>

      {form.localLLMEnabled && (
        <>
          <ol className="list-decimal pl-5 space-y-1 text-[11px] text-slate-300">
            <li>
              {t('settings.local.step1')}{' '}
              <code className="font-mono text-indigo-300 break-all">OLLAMA_ORIGINS={origin} ollama serve</code>
            </li>
            <li>
              {t('settings.local.step2')}{' '}<code className="font-mono text-indigo-300">ollama pull llama3.2:1b</code>
            </li>
            <li>{t('settings.local.step3')}</li>
          </ol>

          <div>
            <label htmlFor="local-llm-base-url" className="block font-semibold text-slate-300 mb-1">{t('settings.local.address')}</label>
            <input
              id="local-llm-base-url"
              type="text"
              value={form.baseUrl}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
              placeholder="http://localhost:11434/v1"
              aria-invalid={badUrl}
              aria-describedby={badUrl ? 'local-llm-url-error' : undefined}
              className={input}
            />
            {badUrl && (
              <p id="local-llm-url-error" role="alert" className="text-[11px] text-rose-300 mt-1">
                {t('settings.local.badUrl')}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="local-llm-model" className="block font-semibold text-slate-300 mb-1">{t('settings.local.model')}</label>
            <input
              id="local-llm-model"
              type="text"
              list="local-llm-models"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              placeholder="llama3.2:1b"
              className={input}
            />
            <datalist id="local-llm-models">
              {(models ?? []).map((m) => <option key={m} value={m} />)}
            </datalist>
          </div>

          <div>
            <label htmlFor="local-llm-api-key" className="block font-semibold text-slate-300 mb-1">{t('settings.local.apiKey')}</label>
            <input
              id="local-llm-api-key"
              type="password"
              autoComplete="off"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder={t('settings.local.apiKeyPlaceholder')}
              className={input}
            />
            <p className="text-[11px] text-slate-400 mt-1">{t('settings.local.apiKeyNote')}</p>
          </div>

          <button
            type="button"
            id="local-llm-test-btn"
            onClick={onTest}
            disabled={testing || badUrl}
            className="self-start min-h-11 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg border border-slate-700 transition disabled:opacity-50"
          >
            {t(testing ? 'settings.local.checking' : 'settings.local.check')}
          </button>
        </>
      )}
    </section>
  )
}
