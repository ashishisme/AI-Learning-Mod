import React, { useState, useEffect } from 'react'
import { useHelpStore } from '../store'
import { rich, useT } from '../i18n'

export const HelpModal: React.FC = () => {
  const { isHelpOpen, setHelpOpen } = useHelpStore()
  const t = useT()
  const [activeTab, setActiveTab] = useState<'usage' | 'ollama' | 'about'>('usage')
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isHelpOpen) {
        setHelpOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isHelpOpen, setHelpOpen])

  if (!isHelpOpen) return null
  // The repository link sits inside the sentence, so the sentence is split around its placeholder.
  const curriculum = t('help.licenseCurriculum').split('{link}')

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCmd(id)
    setTimeout(() => setCopiedCmd(null), 2000)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
      onClick={() => setHelpOpen(false)}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">❓</span>
            <div>
              <h3 id="help-modal-title" className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                {t('help.title')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('help.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setHelpOpen(false)}
            aria-label={t('help.close')}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-100/50 dark:bg-slate-900/50">
          <button
            onClick={() => setActiveTab('usage')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'usage'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>📖</span>
            <span>{t('help.tabUsage')}</span>
          </button>
          <button
            onClick={() => setActiveTab('ollama')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'ollama'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>🦙</span>
            <span>{t('help.tabOllama')}</span>
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'about'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>🏢</span>
            <span>{t('help.tabAbout')}</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs sm:text-sm">
          {/* TAB 1: How to Use the App */}
          {activeTab === 'usage' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40">
                <h4 className="font-bold text-blue-900 dark:text-blue-200 text-sm mb-1 flex items-center gap-1.5">
                  <span>🎚️</span> {t('help.modesTitle')}
                </h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
                  {rich(t('help.modesBody'))}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                  {t('help.simulators')}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <span className="font-bold text-slate-900 dark:text-white block">{t('help.module1')}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('help.module1Body')}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <span className="font-bold text-slate-900 dark:text-white block">{t('help.module2')}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('help.module2Body')}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <span className="font-bold text-slate-900 dark:text-white block">{t('help.module3')}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('help.module3Body')}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <span className="font-bold text-slate-900 dark:text-white block">{t('help.module4')}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('help.module4Body')}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <span className="font-bold text-slate-900 dark:text-white block">{t('help.module5')}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('help.module5Body')}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <span className="font-bold text-slate-900 dark:text-white block">{t('help.module6')}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('help.module6Body')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                  {t('help.audioTitle')}
                </h4>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-2">
                    <span>🔊</span>
                    <span>{rich(t('help.readAloud'))}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>🎙️</span>
                    <span>{rich(t('help.voiceMic'))}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>📚</span>
                    <span>{rich(t('help.grounded'))}</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: How to Use Local LLM (Ollama) */}
          {activeTab === 'ollama' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/50">
                <h4 className="font-bold text-purple-900 dark:text-purple-200 text-sm mb-1 flex items-center gap-1.5">
                  <span>🔒</span> {t('help.privateTitle')}
                </h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
                  {t('help.privateBody')}
                </p>
              </div>

              <div className="space-y-4">
                {/* Step 1 */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">1</span>
                    <strong className="text-slate-900 dark:text-white text-sm">{t('help.step1')}</strong>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    {t('help.step1Body')}
                  </p>
                  <a
                    href="https://ollama.com/download"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition"
                  >
                    <span>{t('help.download')}</span>
                    <span>↗</span>
                  </a>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">2</span>
                    <strong className="text-slate-900 dark:text-white text-sm">{t('help.step2')}</strong>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    {t('help.step2Body')}
                  </p>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 text-purple-200 font-mono text-xs border border-slate-800">
                    <code>ollama serve</code>
                    <button
                      onClick={() => handleCopy('ollama serve', 'serve')}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-[10px] transition"
                    >
                      {t(copiedCmd === 'serve' ? 'help.copied' : 'help.copy')}
                    </button>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">3</span>
                    <strong className="text-slate-900 dark:text-white text-sm">{t('help.step3')}</strong>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    {t('help.step3Body')}
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 text-purple-200 font-mono text-xs border border-slate-800">
                      <div>
                        <code>ollama pull llama3.2:1b</code>
                        <span className="block text-[10px] text-slate-400 font-sans mt-0.5">{t('help.modelLlama')}</span>
                      </div>
                      <button
                        onClick={() => handleCopy('ollama pull llama3.2:1b', 'llama')}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-[10px] transition"
                      >
                        {t(copiedCmd === 'llama' ? 'help.copied' : 'help.copy')}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 text-purple-200 font-mono text-xs border border-slate-800">
                      <div>
                        <code>ollama pull deepseek-r1:1.5b</code>
                        <span className="block text-[10px] text-slate-400 font-sans mt-0.5">{t('help.modelDeepseek')}</span>
                      </div>
                      <button
                        onClick={() => handleCopy('ollama pull deepseek-r1:1.5b', 'deepseek')}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-[10px] transition"
                      >
                        {t(copiedCmd === 'deepseek' ? 'help.copied' : 'help.copy')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">4</span>
                    <strong className="text-slate-900 dark:text-white text-sm">{t('help.step4')}</strong>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {rich(t('help.step4Body'))}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: About Qunisphere & Freeware License */}
          {activeTab === 'about' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200/80 dark:border-emerald-800/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center text-xl shadow-md">
                    🌐
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                      Qunisphere Pvt Limited
                    </h4>
                    <span className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                      {t('help.location')}
                    </span>
                  </div>
                </div>
                <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-xs mt-3">
                  {rich(t('help.freeware'))}
                </p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs mt-2">
                  {t('help.mission')}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                  {t('help.licenseTitle')}
                </h4>
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs space-y-2 text-slate-600 dark:text-slate-300">
                  <p>
                    {rich(t('help.licenseCode'))}
                  </p>
                  <p>
                    {rich(curriculum[0])}<a href="https://github.com/microsoft/AI-For-Beginners" target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 underline font-semibold">microsoft/AI-For-Beginners</a>{rich(curriculum[1])}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {t('help.disclaimer')}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">{t('help.versionLabel')}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{t('help.edition')}</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase">
                  {t('help.release')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-xs text-slate-500">
          <span>{t('help.footer')}</span>
          <button
            onClick={() => setHelpOpen(false)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-xs"
          >
            {t('help.gotIt')}
          </button>
        </div>
      </div>
    </div>
  )
}
