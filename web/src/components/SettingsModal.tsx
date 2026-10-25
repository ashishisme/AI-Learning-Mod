// SPEC: FR-SET-01, FR-SET-02, FR-SET-03, FR-UI-14, NFR-SEC-01
import React, { useState } from 'react'
import { useSettingsStore, AISettings } from '../store'
import { testAIConfig, ConfigTestResult } from '../api'

export const SettingsModal: React.FC = () => {
  const { settings, isDrawerOpen, setDrawerOpen, updateSettings, resetDefaults } = useSettingsStore()

  const [form, setForm] = useState<AISettings>(settings)
  const [showApiKey, setShowApiKey] = useState(false)
  const [showGitToken, setShowGitToken] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<ConfigTestResult | null>(null)
  const [saveToast, setSaveToast] = useState(false)

  // Keep form in sync when opening
  React.useEffect(() => {
    if (isDrawerOpen) {
      setForm(settings)
      setTestResult(null)
    }
  }, [isDrawerOpen, settings])

  if (!isDrawerOpen) return null

  const handlePreset = (preset: 'local' | 'openai' | 'custom') => {
    if (preset === 'local') {
      setForm((prev) => ({
        ...prev,
        provider: 'local',
        baseUrl: 'http://localhost:11434/v1',
        model: 'llama3.2:1b',
        maxBytes: 1500,
      }))
    } else if (preset === 'openai') {
      setForm((prev) => ({
        ...prev,
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        maxBytes: 12000,
      }))
    } else {
      setForm((prev) => ({
        ...prev,
        provider: 'custom',
      }))
    }
    setTestResult(null)
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await testAIConfig({
        baseUrl: form.baseUrl,
        model: form.model,
        apiKey: form.apiKey,
      })
      setTestResult(res)
      if (res.models && res.models.length > 0 && !res.models.includes(form.model)) {
        // Offer first discovered model if current is not in list
        // form.model remains selectable
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        latencyMs: 0,
        error: err.message || 'Connection test failed',
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = () => {
    updateSettings(form)
    setSaveToast(true)
    setTimeout(() => {
      setSaveToast(false)
      setDrawerOpen(false)
    }, 600)
  }

  return (
    <div
      role="dialog"
      aria-label="Settings and AI Configuration"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      onClick={() => setDrawerOpen(false)}
    >
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-slate-900/95 border border-slate-700/80 rounded-2xl p-6 shadow-2xl text-slate-100 flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚙️</span>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">AI & Learning Settings</h2>
              <p className="text-xs text-slate-400">Configure local Ollama, cloud endpoints, and tokens</p>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="text-slate-400 hover:text-slate-200 text-lg font-bold p-1 rounded-lg hover:bg-slate-800 transition"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        {/* Provider Presets */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            AI Provider Preset
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handlePreset('local')}
              className={`p-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition ${
                form.provider === 'local'
                  ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                  : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <span className="text-lg">🦙</span>
              <span>Local Ollama</span>
            </button>
            <button
              type="button"
              onClick={() => handlePreset('openai')}
              className={`p-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition ${
                form.provider === 'openai'
                  ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                  : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <span className="text-lg">⚡</span>
              <span>OpenAI Cloud</span>
            </button>
            <button
              type="button"
              onClick={() => handlePreset('custom')}
              className={`p-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition ${
                form.provider === 'custom'
                  ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                  : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <span className="text-lg">🛠️</span>
              <span>Custom API</span>
            </button>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4 text-xs">
          {/* Base URL */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              API Base Endpoint URL
            </label>
            <input
              type="text"
              id="settings-base-url"
              value={form.baseUrl}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
              placeholder="e.g. http://localhost:11434/v1"
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">Default Ollama endpoint is http://localhost:11434/v1</p>
          </div>

          {/* Model Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-300">
                Model Identifier
              </label>
              {testResult?.models && testResult.models.length > 0 && (
                <span className="text-[11px] text-indigo-400">
                  {testResult.models.length} model(s) discovered
                </span>
              )}
            </div>
            {testResult?.models && testResult.models.length > 0 ? (
              <div className="flex gap-2">
                <select
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500 transition font-mono"
                >
                  {testResult.models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder="Or custom model"
                  className="w-1/2 px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500 transition font-mono"
                />
              </div>
            ) : (
              <input
                type="text"
                id="settings-model"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="e.g. llama3.2:1b, mistral:latest, or gpt-4o-mini"
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono"
              />
            )}
          </div>

          {/* API Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-300">
                AI API Key / Token
              </label>
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="text-[11px] text-indigo-400 hover:underline"
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showApiKey ? 'text' : 'password'}
              id="settings-api-key"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder="Leave blank for Ollama (or enter sk-... for OpenAI)"
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono"
            />
          </div>

          {/* GitHub Token */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-300">
                GitHub Token (Ingestion)
              </label>
              <button
                type="button"
                onClick={() => setShowGitToken(!showGitToken)}
                className="text-[11px] text-indigo-400 hover:underline"
              >
                {showGitToken ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showGitToken ? 'text' : 'password'}
              id="settings-github-token"
              value={form.githubToken}
              onChange={(e) => setForm({ ...form, githubToken: e.target.value })}
              placeholder="github_pat_... (optional for browser)"
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono"
            />
          </div>

          {/* Context Budget */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-300">
                Lesson Context Truncation Budget
              </label>
              <span className="text-[11px] text-slate-400 font-mono">{form.maxBytes} bytes</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, maxBytes: 1500 })}
                className={`flex-1 py-1.5 px-2 rounded border text-[11px] transition ${
                  form.maxBytes === 1500
                    ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                Fast CPU (1.5 KB)
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, maxBytes: 4000 })}
                className={`flex-1 py-1.5 px-2 rounded border text-[11px] transition ${
                  form.maxBytes === 4000
                    ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                Balanced (4 KB)
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, maxBytes: 12000 })}
                className={`flex-1 py-1.5 px-2 rounded border text-[11px] transition ${
                  form.maxBytes === 12000
                    ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                Full Spec (12 KB)
              </button>
            </div>
          </div>
        </div>

        {/* Live Diagnostics Card */}
        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs flex flex-col gap-1 transition ${
              testResult.ok
                ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200'
                : 'border-rose-500/40 bg-rose-950/30 text-rose-200'
            }`}
          >
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5">
                {testResult.ok ? '🟢 Connection Verified' : '🔴 Connection Failed'}
              </span>
              <span className="font-mono text-[11px]">
                {testResult.latencyMs}ms roundtrip
              </span>
            </div>
            {testResult.error ? (
              <p className="text-[11px] text-rose-300 mt-1">{testResult.error}</p>
            ) : (
              <p className="text-[11px] text-emerald-300">
                Model <span className="font-mono font-semibold">{testResult.activeModel}</span> is ready for streaming tutor queries.
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={resetDefaults}
            className="text-xs text-slate-500 hover:text-slate-300 transition"
          >
            Reset Defaults
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="test-connection-btn"
              onClick={handleTestConnection}
              disabled={testing}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {testing ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>Test Connection</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="save-settings-btn"
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5"
            >
              {saveToast ? 'Saved ✓' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
