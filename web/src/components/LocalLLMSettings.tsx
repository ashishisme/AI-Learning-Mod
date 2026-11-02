// SPEC: SPEC-008 FR-021, FR-021a
import React from 'react'
import { AISettings } from '../store'
import { isLocalLLMUrl } from '../api'

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
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const badUrl = !!form.localLLMEnabled && !isLocalLLMUrl(form.baseUrl)

  return (
    <section aria-labelledby="local-llm-h" className="p-4 rounded-xl border border-slate-800 bg-slate-800/30 flex flex-col gap-3 text-xs">
      <div>
        <h3 id="local-llm-h" className="font-semibold text-sm text-slate-200">Your own AI on this computer</h3>
        <p data-testid="settings-hosted-note" className="text-[11px] text-slate-400 mt-1">
          Lessons are managed by this service. For the tutor you can use an AI running on your computer, such as Ollama or LM Studio.
          This site checks each question, then your browser sends it to that AI.
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
        Use my own local AI for the tutor
      </label>

      {form.localLLMEnabled && (
        <>
          <ol className="list-decimal pl-5 space-y-1 text-[11px] text-slate-300">
            <li>
              Start Ollama so it accepts this site:{' '}
              <code className="font-mono text-indigo-300 break-all">OLLAMA_ORIGINS={origin} ollama serve</code>
            </li>
            <li>
              Download a model: <code className="font-mono text-indigo-300">ollama pull llama3.2:1b</code>
            </li>
            <li>If your browser asks to let this site reach devices on your network, allow it.</li>
          </ol>

          <div>
            <label htmlFor="local-llm-base-url" className="block font-semibold text-slate-300 mb-1">Address</label>
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
                Only addresses on this computer work here, such as http://localhost:11434/v1.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="local-llm-model" className="block font-semibold text-slate-300 mb-1">Model</label>
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
            <label htmlFor="local-llm-api-key" className="block font-semibold text-slate-300 mb-1">API key (optional)</label>
            <input
              id="local-llm-api-key"
              type="password"
              autoComplete="off"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder="Most local AIs need none"
              className={input}
            />
            <p className="text-[11px] text-slate-400 mt-1">Kept in this browser and sent only to the address above.</p>
          </div>

          <button
            type="button"
            id="local-llm-test-btn"
            onClick={onTest}
            disabled={testing || badUrl}
            className="self-start min-h-11 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg border border-slate-700 transition disabled:opacity-50"
          >
            {testing ? 'Checking…' : 'Check connection'}
          </button>
        </>
      )}
    </section>
  )
}
