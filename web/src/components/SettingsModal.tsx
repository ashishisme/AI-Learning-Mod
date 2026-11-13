// SPEC: FR-SET-01, FR-SET-02, FR-SET-03, FR-UI-14, FR-UI-15, NFR-SEC-01
import React, { useState } from 'react'
import { useSettingsStore, useThemeStore, useRuntimeStore, useAudienceModeStore, AISettings } from '../store'
import { AgeBandPicker } from './AgeBandPicker'
import { testAIConfig, testLocalLLM, ConfigTestResult } from '../api'
import { LocalLLMSettings } from './LocalLLMSettings'
import pkg from '../../package.json'
import { buildInfo, formatBuild } from '../buildInfo'
import { useT } from '../i18n'
import { LanguageSwitcher } from './LanguageSwitcher'

export const SettingsModal: React.FC = () => {
  const { settings, isDrawerOpen, setDrawerOpen, updateSettings, resetDefaults } = useSettingsStore()
  const { theme, setTheme } = useThemeStore()
  const hosted = useRuntimeStore((st) => st.hosted)
  const t = useT()

  const [form, setForm] = useState<AISettings>(settings)
  const [showApiKey, setShowApiKey] = useState(false)
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

  const audienceMode = useAudienceModeStore((st) => st.mode)
  if (!isDrawerOpen) return null
  // The model name is styled, so the sentence is split around its placeholder.
  const modelReady = t('settings.modelReady').split('{model}')

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
      // FR-021a: a hosted site cannot reach the learner's computer, so the browser checks directly.
      const res = hosted
        ? await testLocalLLM(form.baseUrl, form.apiKey)
        : await testAIConfig({
            baseUrl: form.baseUrl,
            model: form.model,
            apiKey: form.apiKey,
            insecureTls: !!form.insecureTls,
          })
      if (hosted && res.ok && res.models?.includes(form.model)) res.activeModel = form.model
      setTestResult(res)
    } catch (err: any) {
      setTestResult({
        ok: false,
        latencyMs: 0,
        error: err.message || t('settings.testFailed'),
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
      aria-label={t('settings.dialogLabel')}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      onClick={() => setDrawerOpen(false)}
    >
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl text-slate-100 flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚙️</span>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">{t('settings.title')}</h2>
              <p className="text-xs text-slate-400">{t('settings.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="text-slate-400 hover:text-slate-200 text-lg font-bold p-1 rounded-lg hover:bg-slate-800 transition"
            aria-label={t('settings.close')}
          >
            ✕
          </button>
        </div>

        <LanguageSwitcher variant="settings" />

        {/* SPEC FR-UI-16 (amended 2.11.0): Kids age band, shown only in the Kids journey */}
        {audienceMode === 'junior' && (
          <div data-testid="settings-age-band">
            <span className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              {t('ageBand.settingTitle')}
            </span>
            <AgeBandPicker />
          </div>
        )}

        {/* Theme Preference (FR-UI-15) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            {t('settings.theme')}
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              id="theme-light-btn"
              onClick={() => setTheme('light')}
              className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition ${
                theme === 'light'
                  ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                  : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>☀️</span>
              <span>{t('settings.themeLight')}</span>
            </button>
            <button
              type="button"
              id="theme-dark-btn"
              onClick={() => setTheme('dark')}
              className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition ${
                theme === 'dark'
                  ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                  : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🌙</span>
              <span>{t('settings.themeDark')}</span>
            </button>
            <button
              type="button"
              id="theme-system-btn"
              onClick={() => setTheme('system')}
              className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition ${
                theme === 'system'
                  ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                  : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🖥️</span>
              <span>{t('settings.themeSystem')}</span>
            </button>
          </div>
        </div>

        {/* FR-021: on a hosted deployment the server's AI provider, credentials and certificate handling
            are not shown. FR-021a: the learner may instead point the tutor at an AI on their own computer. */}
        {hosted ? (
          <LocalLLMSettings
            form={form}
            setForm={setForm}
            models={testResult?.models}
            testing={testing}
            onTest={handleTestConnection}
          />
        ) : (
          <>
        {/* Provider Presets */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            {t('settings.preset')}
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
              <span>{t('settings.presetLocal')}</span>
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
              <span>{t('settings.presetOpenai')}</span>
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
              <span>{t('settings.presetCustom')}</span>
            </button>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4 text-xs">
          {/* Base URL */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              {t('settings.baseUrl')}
            </label>
            <input
              type="text"
              id="settings-base-url"
              value={form.baseUrl}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
              placeholder={t('settings.baseUrlPlaceholder')}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono"
            />
          </div>

          {/* Insecure TLS (opt-in) */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                id="settings-insecure-tls"
                checked={!!form.insecureTls}
                onChange={(e) => setForm({ ...form, insecureTls: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-slate-600 accent-amber-500"
              />
              <span>
                <span className="block font-semibold text-slate-200">
                  {t('settings.insecureTls')}
                </span>
                <span className="block text-[11px] text-slate-400 mt-0.5">
                  {t('settings.insecureTlsHelp')}
                </span>
              </span>
            </label>
            {form.insecureTls && (
              <p
                role="alert"
                data-testid="insecure-tls-warning"
                className="mt-2 text-[11px] text-amber-300"
              >
                {t('settings.insecureTlsWarning')}
              </p>
            )}
          </div>

          {/* Model Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-300">
                {t('settings.model')}
              </label>
              {testResult?.models && testResult.models.length > 0 && (
                <span className="text-[11px] text-indigo-400">
                  {t('settings.modelsFound', { count: testResult.models.length })}
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
                  placeholder={t('settings.customModel')}
                  className="w-1/2 px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500 transition font-mono"
                />
              </div>
            ) : (
              <input
                type="text"
                id="settings-model"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder={t('settings.modelPlaceholder')}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono"
              />
            )}
          </div>

          {/* API Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-300">
                {t('settings.apiKey')}
              </label>
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="text-[11px] text-indigo-400 hover:underline"
              >
                {t(showApiKey ? 'settings.hide' : 'settings.show')}
              </button>
            </div>
            <input
              type={showApiKey ? 'text' : 'password'}
              id="settings-api-key"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder={t('settings.apiKeyPlaceholder')}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono"
            />
          </div>

          {/* Context Budget */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-300">
                {t('settings.budget')}
              </label>
              <span className="text-[11px] text-slate-400 font-mono">{t('settings.bytes', { n: form.maxBytes })}</span>
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
                {t('settings.budgetFast')}
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
                {t('settings.budgetBalanced')}
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
                {t('settings.budgetFull')}
              </button>
            </div>
          </div>
        </div>

          </>
        )}

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
                {t(testResult.ok ? 'settings.verified' : 'settings.failed')}
              </span>
              <span className="font-mono text-[11px]">
                {t('settings.latency', { ms: testResult.latencyMs })}
              </span>
            </div>
            {testResult.error ? (
              <p className="text-[11px] text-rose-300 mt-1">{testResult.error}</p>
            ) : (
              <p className="text-[11px] text-emerald-300">
                {modelReady[0]}<span className="font-mono font-semibold">{testResult.activeModel}</span>{modelReady[1]}
              </p>
            )}
          </div>
        )}

        {/* Version & Build Information (Auto-derived from package.json) */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs" data-testid="settings-version-info">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span className="font-semibold text-slate-300">{t('app.name')}</span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-bold">
              {buildInfo.release || `v${pkg.version}`}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono" data-testid="settings-build-info">
            {formatBuild()}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={resetDefaults}
            className="text-xs text-slate-500 hover:text-slate-300 transition"
          >
            {t('settings.reset')}
          </button>

          <div className="flex items-center gap-2">
            {!hosted && (
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
                  <span>{t('settings.testing')}</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>{t('settings.test')}</span>
                </>
              )}
            </button>
            )}

            <button
              type="button"
              id="save-settings-btn"
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5"
            >
              {t(saveToast ? 'settings.saved' : 'settings.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
