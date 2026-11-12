import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Settings2, 
  Volume2, 
  Globe2, 
  Cpu, 
  Palette, 
  Save, 
  RotateCcw,
  Sparkles,
  Lock,
  Radio,
  Sliders,
  Check
} from 'lucide-react';
import type { GeminiModelId } from '../types';

export interface UserPersonalizationConfig {
  displayName: string;
  adminTitle: string;
  assistantTone: string;
  customSystemPrompt: string;
  themeAccent: 'emerald' | 'cyan' | 'violet' | 'amber' | 'rose';
  defaultModel: GeminiModelId;
  defaultLanguage: string;
  autoPlayVoice: boolean;
  voicePitch: number;
  voiceSpeed: number;
  streamResponses: boolean;
  encryptAllLogs: boolean;
  instantAdminPower: boolean;
}

export const DEFAULT_USER_CONFIG: UserPersonalizationConfig = {
  displayName: 'Master Operator (Beheerder)',
  adminTitle: 'Full Superadmin (Onbeperkte Rechten)',
  assistantTone: 'Natuurlijk, warm, intellectueel, to-the-point',
  customSystemPrompt: 'Je bent KluisAI, een uiterst discrete en behulpzame AI assistent met respect voor privacy, data-soevereiniteit en absolute controle voor de gebruiker.',
  themeAccent: 'emerald',
  defaultModel: 'gemini-4-hydrogen',
  defaultLanguage: 'nl-NL',
  autoPlayVoice: true,
  voicePitch: 1.0,
  voiceSpeed: 1.0,
  streamResponses: true,
  encryptAllLogs: true,
  instantAdminPower: true,
};

interface UserPreferencesProps {
  config: UserPersonalizationConfig;
  onSaveConfig: (newConfig: UserPersonalizationConfig) => void;
  isHighContrast?: boolean;
}

export const UserPreferences: React.FC<UserPreferencesProps> = ({
  config,
  onSaveConfig,
  isHighContrast = false,
}) => {
  const [form, setForm] = useState<UserPersonalizationConfig>(config);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleReset = () => {
    setForm(DEFAULT_USER_CONFIG);
    onSaveConfig(DEFAULT_USER_CONFIG);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className={`p-6 max-w-4xl mx-auto space-y-6 ${isHighContrast ? 'text-black dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Settings2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Volledige Aanpasbaarheid & Admin Rechten
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Elke gebruiker beschikt over 100% root/admin-bevoegdheden om de app, Gemini-parameters, spraak en prompts naar eigen wens aan te passen.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Standaard Herstellen
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Uw instellingen en admin-privileges zijn direct geactiveerd en lokaal opgeslagen!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Admin Identity & Authority */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
            <ShieldCheck className="w-5 h-5" />
            <span>Gebruiker-Admin Autorisatie & Identiteit</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Uw Weergavenaam / Operator Naam
              </label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Admin Privilege Titel
              </label>
              <input
                type="text"
                value={form.adminTitle}
                onChange={(e) => setForm({ ...form, adminTitle: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Volledig beheerrecht ingeschakeld: terminal toegang, sleutelrotatie en datasanering zonder restricties.</span>
            </div>
            <span className="font-mono font-bold text-[11px] bg-emerald-200 dark:bg-emerald-900 px-2 py-0.5 rounded text-emerald-950 dark:text-emerald-100">
              ROOT / ALL PRIVILEGES
            </span>
          </div>
        </div>

        {/* Gemini Engine & System Instruction Customization */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-bold text-sm">
            <Cpu className="w-5 h-5" />
            <span>AI Gedrag & Aangepaste Systeemprompt</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Standaard Gemini Model Selectie
              </label>
              <select
                value={form.defaultModel}
                onChange={(e) => setForm({ ...form, defaultModel: e.target.value as any })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
              >
                <option value="gemini-4-hydrogen">gemini-4-hydrogen (Snelle universele intelligentie)</option>
                <option value="gemini-4-carbon">gemini-4-carbon (Diepste redenering & code analyse)</option>
                <option value="gemini-4-argon">gemini-4-argon (Complexe interactieve taken)</option>
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Ultra-lage latentie)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Persoonlijke Rol & Systeemprompt (Volledig Bewerkbaar)
              </label>
              <textarea
                rows={3}
                value={form.customSystemPrompt}
                onChange={(e) => setForm({ ...form, customSystemPrompt: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                placeholder="Geef hier uw instructie mee hoe Gemini moet antwoorden..."
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                U heeft de volledige controle over de toon, rol, vakgebied en antwoordstijl van de AI assistent.
              </span>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Gewenste Toon van Antwoorden
              </label>
              <input
                type="text"
                value={form.assistantTone}
                onChange={(e) => setForm({ ...form, assistantTone: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Dutch Voice & Speech Customization */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
            <Volume2 className="w-5 h-5" />
            <span>Nederlandse Stem & Audio Instellingen</span>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                Speel gesproken antwoord automatisch af bij aankomst (Gemini TTS)
              </span>
              <input
                type="checkbox"
                checked={form.autoPlayVoice}
                onChange={(e) => setForm({ ...form, autoPlayVoice: e.target.checked })}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                Activeer client-side AES encryptie voor alle lokale chat logs
              </span>
              <input
                type="checkbox"
                checked={form.encryptAllLogs}
                onChange={(e) => setForm({ ...form, encryptAllLogs: e.target.checked })}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
            </label>
          </div>
        </div>

        {/* Submit Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Instellingen Opslaan & Toepassen
          </button>
        </div>
      </form>
    </div>
  );
};
