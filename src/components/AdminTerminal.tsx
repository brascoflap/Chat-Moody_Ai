import React, { useEffect, useState } from 'react';
import { 
  Terminal as TerminalIcon, 
  ShieldAlert, 
  Users, 
  Sliders, 
  RefreshCw, 
  Key, 
  HardDrive, 
  CheckCircle2, 
  AlertTriangle,
  Play
} from 'lucide-react';
import type { SystemConfig, SystemMetrics, UserAccount } from '../types';

interface AdminTerminalProps {
  socket: WebSocket | null;
  onAuditRecorded?: (action: string) => void;
  isHighContrast?: boolean;
}

export const AdminTerminal: React.FC<AdminTerminalProps> = ({
  socket,
  onAuditRecorded,
  isHighContrast = false,
}) => {
  const [activeTab, setActiveTab] = useState<'console' | 'monitoring' | 'users' | 'security' | 'config'>('console');
  
  // Terminal console state
  const [inputCommand, setInputCommand] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<Array<{ cmd?: string; text: string; type: 'input' | 'output' | 'error' | 'sys' }>>([
    { text: 'KluisAI Enterprise Security Terminal v4.1 (Kernel: Node/TS-Linux)', type: 'sys' },
    { text: 'Access Level: ROOT_ADMIN (Role: Master Operator)', type: 'sys' },
    { text: 'Type "help" to review system diagnostics and operator directives.', type: 'sys' },
  ]);

  // System state fetched from backend
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Load admin data
  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/system');
      if (res.ok) {
        const data = await res.json();
        setSystemMetrics(data.metrics);
        setSystemConfig(data.config);
        setUsers(data.users);
        setAuditLogs(data.auditLogs);
      }
    } catch (err) {
      console.error('Failed to load admin telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Listen to websocket terminal responses
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'terminal:output') {
          setTerminalHistory(prev => [
            ...prev,
            { text: data.payload.output, type: 'output' },
          ]);
        } else if (data.type === 'config:updated') {
          setSystemConfig(data.payload);
        }
      } catch (e) {
        // ignore parse errors
      }
    };

    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket]);

  const executeCommand = (cmdText: string) => {
    const trimmed = cmdText.trim();
    if (!trimmed) return;

    if (trimmed.toLowerCase() === 'clear') {
      setTerminalHistory([]);
      setInputCommand('');
      return;
    }

    setTerminalHistory(prev => [
      ...prev,
      { cmd: trimmed, text: trimmed, type: 'input' },
    ]);

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'terminal:command',
        payload: { command: trimmed },
      }));
    } else {
      // Local fallback execution if WS reconnecting
      let localResponse = `[LOCAL OFFLINE EVAL] Node command '${trimmed}' executed. Sync buffered.`;
      if (trimmed === 'help') {
        localResponse = 'Available: status, users, audit, sync, rotate-keys, clear, mode [dev|prod|maint]';
      }
      setTerminalHistory(prev => [
        ...prev,
        { text: localResponse, type: 'output' },
      ]);
    }

    if (onAuditRecorded) {
      onAuditRecorded(`Admin executed command: ${trimmed}`);
    }

    setInputCommand('');
  };

  const handleUpdateConfig = async (partialConfig: Partial<SystemConfig>) => {
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partialConfig),
      });
      if (res.ok) {
        const data = await res.json();
        setSystemConfig(data.config);
        setStatusMsg({ text: 'Global configuration successfully deployed and broadcasted.' });
        setTimeout(() => setStatusMsg(null), 4000);
      }
    } catch (err: any) {
      setStatusMsg({ text: 'Configuration failed: ' + err.message, isError: true });
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch('/api/admin/user-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: newStatus }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus as any } : u));
        setStatusMsg({ text: `User status changed to ${newStatus}.` });
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (err: any) {
      setStatusMsg({ text: 'Failed to update user: ' + err.message, isError: true });
    }
  };

  return (
    <div className={`flex flex-col h-full bg-slate-950 text-slate-100 rounded-xl border ${
      isHighContrast ? 'border-white' : 'border-slate-800'
    } shadow-2xl overflow-hidden`}>
      {/* Terminal Top Control Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-slate-200 flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-emerald-400" />
            ADMIN TERMINAL & SECURITY GOVERNANCE
          </span>
          <span className="text-xs text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded">
            ROOT AUTH
          </span>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('console')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeTab === 'console' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Live Shell
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeTab === 'monitoring' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Telemetry
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeTab === 'users' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Access & Users
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeTab === 'security' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Security Audit
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeTab === 'config' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Global Policy
          </button>
        </div>

        <button
          onClick={fetchAdminData}
          title="Refresh server state"
          className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {statusMsg && (
        <div className={`px-4 py-2 text-xs font-medium flex items-center gap-2 ${
          statusMsg.isError ? 'bg-rose-950 text-rose-200 border-b border-rose-800' : 'bg-emerald-950 text-emerald-200 border-b border-emerald-800'
        }`}>
          {statusMsg.isError ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Main Terminal Viewport */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed">
        {activeTab === 'console' && (
          <div className="flex flex-col h-full justify-between">
            <div className="space-y-1.5 overflow-y-auto pr-2 max-h-[calc(100vh-280px)]">
              {terminalHistory.map((item, idx) => (
                <div key={idx} className="break-words">
                  {item.type === 'sys' && (
                    <span className="text-slate-400"># {item.text}</span>
                  )}
                  {item.type === 'input' && (
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                      <span>root@kluisai-cluster:~$</span>
                      <span>{item.text}</span>
                    </div>
                  )}
                  {item.type === 'output' && (
                    <pre className="text-slate-300 font-mono whitespace-pre-wrap pl-4 border-l-2 border-slate-800 my-1">
                      {item.text}
                    </pre>
                  )}
                </div>
              ))}
            </div>

            {/* CLI Command Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeCommand(inputCommand);
              }}
              className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2"
            >
              <span className="text-emerald-400 font-bold whitespace-nowrap">root@kluisai-cluster:~$</span>
              <input
                type="text"
                value={inputCommand}
                onChange={(e) => setInputCommand(e.target.value)}
                placeholder="Enter directive (e.g., status, audit, users, rotate-keys, help)..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-sans font-medium flex items-center gap-1.5 transition"
              >
                <Play className="w-3.5 h-3.5" /> Run
              </button>
            </form>
          </div>
        )}

        {/* Tab: System Telemetry */}
        {activeTab === 'monitoring' && (
          <div className="space-y-6 font-sans">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Active P2P Sync Nodes</span>
                <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
                  {systemMetrics?.activeConnections ?? 1}
                </span>
              </div>
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Total Gemini Chats</span>
                <span className="text-2xl font-bold font-mono text-cyan-400 tabular-nums">
                  {systemMetrics?.totalChatsProcessed ?? 0}
                </span>
              </div>
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Dutch Audio Streams</span>
                <span className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
                  {systemMetrics?.ttsGenerations ?? 0}
                </span>
              </div>
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Memory RSS</span>
                <span className="text-2xl font-bold font-mono text-slate-200 tabular-nums">
                  {systemMetrics?.memoryUsageMb ?? 42} MB
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-3">
              <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                Cluster Sovereign Invariants
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Zero-Knowledge Storage:</span>
                  <span className="text-emerald-400 font-mono">AES-GCM-256 (Client-side)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Gemini Neural Gateway:</span>
                  <span className="text-emerald-400 font-mono">{systemConfig?.defaultModel || 'gemini-4-hydrogen'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Sync Relay Address:</span>
                  <span className="text-slate-300 font-mono">{systemConfig?.syncNodeAddress}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Cluster Uptime:</span>
                  <span className="text-slate-300 font-mono tabular-nums">{systemMetrics?.systemUptimeSeconds || 0} seconds</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Access & User Management */}
        {activeTab === 'users' && (
          <div className="space-y-4 font-sans">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-semibold text-slate-200">Registered Access Operators</h4>
                <p className="text-xs text-slate-400">Manage cryptographic identities, roles, and vault privileges.</p>
              </div>
            </div>

            <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono">
                  <tr>
                    <th className="py-2.5 px-3">Identity / Email</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Key Fingerprint</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-850">
                      <td className="py-2.5 px-3 font-medium text-slate-200">{u.email}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{u.encryptionKeyFingerprint}</td>
                      <td className="py-2.5 px-3">
                        <span className={`font-medium ${u.status === 'active' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {u.status === 'active' ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => toggleUserStatus(u.id, u.status)}
                          className={`px-2.5 py-1 text-xs rounded font-medium transition ${
                            u.status === 'active'
                              ? 'bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-800'
                              : 'bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-800'
                          }`}
                        >
                          {u.status === 'active' ? 'Revoke Access' : 'Restore'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Security Audits */}
        {activeTab === 'security' && (
          <div className="space-y-4 font-sans">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-semibold text-slate-200">Immutable Audit Trail</h4>
                <p className="text-xs text-slate-400">Cryptographic audit log of authorization, file transmissions, and key operations.</p>
              </div>
              <button
                onClick={() => executeCommand('rotate-keys')}
                className="px-3 py-1.5 bg-amber-950 text-amber-300 border border-amber-800 hover:bg-amber-900 text-xs rounded font-medium flex items-center gap-1.5 transition"
              >
                <Key className="w-3.5 h-3.5" /> Rotate Sync Key
              </button>
            </div>

            <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-900 rounded border border-slate-800 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                        log.severity === 'ALERT' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                        log.severity === 'WARNING' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {log.eventType}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()} · {new Date(log.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-200">{log.description}</p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">{log.actor}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Global Configuration */}
        {activeTab === 'config' && systemConfig && (
          <div className="space-y-4 font-sans max-w-2xl">
            <h4 className="text-sm font-semibold text-slate-200">System Policy & Neural Engine Controls</h4>

            <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Default Gemini Model Engine</label>
                <select
                  value={systemConfig.defaultModel}
                  onChange={(e) => handleUpdateConfig({ defaultModel: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="gemini-4-hydrogen">gemini-4-hydrogen (General Conversational & Fast reasoning)</option>
                  <option value="gemini-4-carbon">gemini-4-carbon (Deep reasoning, root-cause analysis)</option>
                  <option value="gemini-4-argon">gemini-4-argon (Complex interactive coding & math)</option>
                  <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Ultra-low latency streaming)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Dutch Speech Synthesis Voice Profile</label>
                <div className="grid grid-cols-5 gap-2">
                  {(['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'] as const).map(voice => (
                    <button
                      key={voice}
                      type="button"
                      onClick={() => handleUpdateConfig({ dutchVoiceName: voice })}
                      className={`py-2 px-2 text-xs rounded border text-center transition ${
                        systemConfig.dutchVoiceName === voice
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-200 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {voice}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Dutch Speech Tone & Accent Directive</label>
                <input
                  type="text"
                  value={systemConfig.dutchSpeechStyle}
                  onChange={(e) => handleUpdateConfig({ dutchSpeechStyle: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-slate-800">
                <div>
                  <span className="font-medium text-slate-200 block">Enforce Client-Side Offline Storage Encryption</span>
                  <span className="text-slate-400 text-[11px]">Encrypts all chat logs and transcripts before writing to local IndexedDB.</span>
                </div>
                <input
                  type="checkbox"
                  checked={systemConfig.offlineEncryptionEnabled}
                  onChange={(e) => handleUpdateConfig({ offlineEncryptionEnabled: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-slate-800">
                <div>
                  <span className="font-medium text-slate-200 block">Maintenance & Tamper Lockdown</span>
                  <span className="text-slate-400 text-[11px]">Limits public endpoint access to authenticated security terminals.</span>
                </div>
                <input
                  type="checkbox"
                  checked={systemConfig.maintenanceMode}
                  onChange={(e) => handleUpdateConfig({ maintenanceMode: e.target.checked })}
                  className="w-4 h-4 accent-rose-500 rounded"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
