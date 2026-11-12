import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Trash2, 
  Download, 
  Key, 
  EyeOff, 
  Lock, 
  CheckCircle2, 
  HardDriveDownload,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';
import { dbClear } from '../lib/storage';

interface PrivacyDashboardProps {
  onClearLocalHistory: () => Promise<void>;
  totalEncryptedSessions: number;
  totalEncryptedFiles: number;
  masterKeyBase64: string | null;
  onRotateLocalKey: () => Promise<void>;
  isHighContrast?: boolean;
}

export const PrivacyDashboard: React.FC<PrivacyDashboardProps> = ({
  onClearLocalHistory,
  totalEncryptedSessions,
  totalEncryptedFiles,
  masterKeyBase64,
  onRotateLocalKey,
  isHighContrast = false,
}) => {
  const [zeroRetention, setZeroRetention] = useState(false);
  const [allowTelemetry, setAllowTelemetry] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleExportData = async () => {
    try {
      const dump = {
        exportedAt: new Date().toISOString(),
        vaultFormat: 'KluisAI_Encrypted_Backup_v1',
        sessionsCount: totalEncryptedSessions,
        filesCount: totalEncryptedFiles,
        encryptionAlgorithm: 'AES-GCM-256',
        notice: 'Zero-knowledge encrypted. Master decryption key is kept solely on client device.',
      };

      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kluisai_vault_export_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setStatusMessage('Data vault metadata successfully downloaded.');
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (e: any) {
      setStatusMessage('Export error: ' + e.message);
    }
  };

  const handleClearVault = async () => {
    try {
      await onClearLocalHistory();
      setConfirmClear(false);
      setStatusMessage('All local conversation histories & cache permanently cleared.');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage('Clear error: ' + err.message);
    }
  };

  return (
    <div className={`p-6 max-w-4xl mx-auto space-y-6 ${isHighContrast ? 'text-black dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Personal Privacy & Data Sovereignty Dashboard
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Zero-knowledge cryptography controls: all data is sealed with client-held keys before writing to offline disk storage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportData}
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" /> Export Vault Metadata
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Cryptographic Key Vault Card */}
      <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Device Master Encryption Key (AES-GCM-256)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Managed in browser Web Crypto API. Never transmitted to any remote server unencrypted.</p>
            </div>
          </div>
          <button
            onClick={onRotateLocalKey}
            className="px-3 py-1.5 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
          >
            Rotate Local Key
          </button>
        </div>

        <div className="p-3 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <Lock className="w-4 h-4 text-slate-400 shrink-0" />
            <code className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate">
              {masterKeyBase64 ? `${masterKeyBase64.slice(0, 16)}...[REDACTED_256BIT_SEAL]` : 'Generating key...'}
            </code>
          </div>
          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">E2EE ACTIVE</span>
        </div>
      </div>

      {/* Storage Metrics & Privacy Knobs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Storage stats */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <HardDriveDownload className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            Local Encrypted Vault Footprint
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Encrypted Chat Threads</span>
              <span className="font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-200">{totalEncryptedSessions}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Secure Shared Files</span>
              <span className="font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-200">{totalEncryptedFiles}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500 dark:text-slate-400">Offline Availability</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">100% Client-IndexedDB</span>
            </div>
          </div>
        </div>

        {/* Privacy options */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            Data Retention & Telemetry Settings
          </h3>
          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-600 dark:text-slate-300">Ephemereal Incognito Mode (No local disk persistence)</span>
              <input
                type="checkbox"
                checked={zeroRetention}
                onChange={(e) => setZeroRetention(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-600 dark:text-slate-300">Share Anonymous Reliability Metrics</span>
              <input
                type="checkbox"
                checked={allowTelemetry}
                onChange={(e) => setAllowTelemetry(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Danger Zone: Permanent Clearing */}
      <div className="p-5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 space-y-3">
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <h3 className="text-sm font-semibold">Immediate Sanitization & History Wipe</h3>
        </div>
        <p className="text-xs text-rose-600 dark:text-rose-300">
          Permanently delete all locally encrypted conversations, cached multilingual voice recordings, and audit receipts stored on this machine. This cannot be undone.
        </p>

        {!confirmClear ? (
          <button
            onClick={() => setConfirmClear(true)}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-2 shadow-sm"
          >
            <Trash2 className="w-4 h-4" /> Wipe Local Encrypted Storage
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={handleClearVault}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-700 hover:bg-rose-800 text-white transition flex items-center gap-2"
            >
              Confirm Permanent Erasure
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
