import React, { useState } from 'react';
import { 
  FileUp, 
  Download, 
  Trash2, 
  Lock, 
  FileCheck, 
  ShieldAlert, 
  HardDrive,
  Users,
  RefreshCw
} from 'lucide-react';
import { encryptFileBuffer, decryptFileBuffer } from '../lib/crypto';
import type { StoredFile } from '../lib/storage';

interface FileSharingProps {
  files: StoredFile[];
  masterKey: CryptoKey | null;
  onUploadEncryptedFile: (file: StoredFile) => Promise<void>;
  onDeleteFile: (fileId: string) => Promise<void>;
  isHighContrast?: boolean;
}

export const FileSharing: React.FC<FileSharingProps> = ({
  files,
  masterKey,
  onUploadEncryptedFile,
  onDeleteFile,
  isHighContrast = false,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !masterKey) return;

    setIsProcessing(true);
    setStatusMsg(`Encrypting "${file.name}" with client AES-GCM-256...`);

    try {
      const buffer = await file.arrayBuffer();
      const { cipherBase64, ivBase64 } = await encryptFileBuffer(buffer, masterKey);

      const fileObj: StoredFile = {
        id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        uploadedAt: Date.now(),
        uploader: 'Client Vault (Device-Local)',
        encryptedData: cipherBase64,
        iv: ivBase64,
      };

      await onUploadEncryptedFile(fileObj);
      setStatusMsg(`"${file.name}" securely encrypted and synced to peer nodes.`);
      setTimeout(() => setStatusMsg(null), 3500);
    } catch (err: any) {
      console.error('File encryption failed:', err);
      setStatusMsg('Encryption failed: ' + err.message);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleDownloadDecrypted = async (file: StoredFile) => {
    if (!masterKey) return;

    setDownloadingId(file.id);
    try {
      const decryptedBuffer = await decryptFileBuffer(file.encryptedData, file.iv, masterKey);
      const blob = new Blob([decryptedBuffer], { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Decryption failed:', err);
      alert('Decryption failed: Device does not hold the matching encryption key.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className={`p-6 max-w-4xl mx-auto space-y-6 ${isHighContrast ? 'text-black dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Lock className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            End-to-End Encrypted File Sharing
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Files are sealed locally using AES-GCM 256 before upload. Relay servers see only encrypted ciphertext.
          </p>
        </div>

        <div>
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg transition shadow-sm">
            <FileUp className="w-4 h-4" />
            <span>Select & Seal File</span>
            <input 
              type="file" 
              className="hidden" 
              onChange={handleFileUpload} 
              disabled={isProcessing}
            />
          </label>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs rounded-lg flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Files List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {files.length === 0 ? (
          <div className="p-12 text-center">
            <Lock className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">No Encrypted Files Stored</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Upload any document or code to encrypt it locally on this machine and securely share with paired remote devices.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-mono">
              <tr>
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Cipher / Algorithm</th>
                <th className="py-3 px-4">Synced By</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate max-w-[200px]" title={file.fileName}>{file.fileName}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono tabular-nums">
                    {(file.size / 1024).toFixed(1)} KB
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      AES-GCM-256
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs">
                    {file.uploader}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDownloadDecrypted(file)}
                        disabled={downloadingId === file.id}
                        className="px-2.5 py-1 text-xs font-medium rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{downloadingId === file.id ? 'Decrypting...' : 'Decrypt & Save'}</span>
                      </button>
                      <button
                        onClick={() => onDeleteFile(file.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Delete encrypted file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
