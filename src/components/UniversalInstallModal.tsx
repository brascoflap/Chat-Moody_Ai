import React, { useState } from 'react';
import { Download, Monitor, CheckCircle, Smartphone, Terminal, HelpCircle, X } from 'lucide-react';
import { usePWAInstall } from '../lib/usePWAInstall';

export const UniversalInstallModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, platformName, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'auto' | 'linux' | 'mac' | 'windows' | 'mobile'>('auto');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-600">
              <Download className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Moody.Ai Universele App Installatie</h3>
              <p className="text-[11px] text-slate-400">Installeer als standalone desktop applicatie op Linux, macOS of Windows</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/moody-ai-universal-installer.zip"
              download="moody-ai-universal-installer.zip"
              className="btn-neon px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm"
              title="Download alle installatiebestanden + handleiding in één ZIP-pakket"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Volledig ZIP Pakket</span>
            </a>
            <button 
              onClick={onClose} 
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Platform selection tabs */}
        <div className="flex items-center gap-1 p-2 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('auto')}
            className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
              activeTab === 'auto' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Mijn Apparaat ({platformName})
          </button>
          <button
            onClick={() => setActiveTab('linux')}
            className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
              activeTab === 'linux' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Linux Desktop
          </button>
          <button
            onClick={() => setActiveTab('mac')}
            className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
              activeTab === 'mac' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            macOS
          </button>
          <button
            onClick={() => setActiveTab('windows')}
            className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
              activeTab === 'windows' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Windows 10/11
          </button>
          <button
            onClick={() => setActiveTab('mobile')}
            className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
              activeTab === 'mobile' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            iOS & Android
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 space-y-4 text-xs text-slate-700 dark:text-slate-300">
          {activeTab === 'auto' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                <Monitor className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Gedetecteerd platform: {platformName}
                  </h4>
                  <p className="text-slate-600 dark:text-slate-400">
                    KluisAI functioneert als native desktop venster met offline opslag, hardware microfoontoegang en end-to-end encryptie.
                  </p>
                </div>
              </div>

              {isInstalled ? (
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle className="w-5 h-5" />
                  <span>KluisAI is al geïnstalleerd als standalone applicatie!</span>
                </div>
              ) : isInstallable ? (
                <button
                  onClick={async () => {
                    const success = await install();
                    if (success) onClose();
                  }}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm"
                >
                  <Download className="w-5 h-5" />
                  Installeer Nu op {platformName} (1 Klik)
                </button>
              ) : (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    Installatie via uw browserbalk:
                  </span>
                  <p className="text-slate-500 dark:text-slate-400">
                    Klik in Chrome, Edge of Brave op het installatie-icoon <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">⊕ Installeer KluisAI</span> aan het einde van de adresbalk of in het browsermenu.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'linux' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-600" /> Linux Desktop (Ubuntu, Debian, Fedora, Arch)
                </h4>
                <a
                  href="/install-linux.sh"
                  download="install-linux.sh"
                  className="btn-neon px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Download .sh Installer
                </a>
              </div>
              <p>
                Installeer Moody.Ai direct als native desktop applicatie met launcher icoon in GNOME Dash / KDE Menu en terminal commando <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">moody-ai</code>:
              </p>
              <div className="bg-slate-950 text-slate-200 p-3 rounded-lg font-mono text-[11px] space-y-1.5">
                <p className="text-slate-400"># 1. Voer uit in uw Linux terminal (1-regel installatie):</p>
                <p className="text-emerald-400 select-all bg-slate-900 p-1.5 rounded">
                  curl -fsSL {window.location.origin}/install-linux.sh | bash
                </p>
                <p className="text-slate-400"># 2. Of start standalone venster direct:</p>
                <p className="text-cyan-400">google-chrome --app={window.location.href}</p>
              </div>
            </div>
          )}

          {activeTab === 'mac' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Monitor className="w-4 h-4 text-emerald-600" /> macOS App (Apple Silicon M1/M2/M3 & Intel)
                </h4>
                <a
                  href="/MoodyAi-macOS.zip"
                  download="MoodyAi-macOS.zip"
                  className="btn-neon px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-sm"
                  title="Download MoodyAi.app direct als macOS applicatie"
                >
                  <Download className="w-3 h-3" /> Download MoodyAi.app
                </a>
              </div>
              <p>
                Download de officiële <strong>MoodyAi.app</strong> applicatiebundel voor macOS. Deze draait in een eigen venster in het Dock, met microfoontoegang en offline E2EE functionaliteit:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300">
                <li>Klik op <strong>Download MoodyAi.app</strong> hierboven en pak het zip-bestand uit.</li>
                <li>Sleep <strong>MoodyAi.app</strong> naar uw map <strong>Programma's</strong> (Applications).</li>
                <li>Dubbelklik op MoodyAi om de app native te starten of open via <strong>Spotlight</strong> (<code>Cmd + Spatie</code>).</li>
                <li>De app nestelt zich in uw Dock en functioneert ook volledig offline.</li>
              </ol>
            </div>
          )}

          {activeTab === 'windows' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                <h4 className="font-bold text-slate-900 dark:text-slate-100">Windows 10 & 11</h4>
                <a
                  href="/install-windows.bat"
                  download="install-windows.bat"
                  className="btn-neon px-3 py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-[11px] font-bold flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Download .bat Installer
                </a>
              </div>
              <p>
                Ondersteunt volledige Windows integratie inclusief taakbalk vastpinnen, startmenu snelkoppeling en venster snapping.
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300">
                <li>Klik in Microsoft Edge of Chrome op het installatie-icoon in de adresbalk.</li>
                <li>Of download en dubbelklik op het <strong>install-windows.bat</strong> bestand hierboven.</li>
                <li>Er wordt direct een snelkoppeling geplaatst op uw Bureaublad en in het Startmenu!</li>
              </ol>
            </div>
          )}

          {activeTab === 'mobile' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" /> Mobiel (iOS & Android)
              </h4>
              <div className="space-y-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="font-semibold block text-slate-800 dark:text-slate-200">Apple iOS (Safari):</span>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Tik op het <strong>Deel-icoon</strong> (vierkantje met pijl omhoog) onderin Safari en selecteer <strong>"Zet op beginscherm"</strong>.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="font-semibold block text-slate-800 dark:text-slate-200">Android (Chrome):</span>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Tik op ⋮ en kies <strong>"App installeren"</strong> of <strong>"Toevoegen aan startscherm"</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-medium text-xs transition"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
};
