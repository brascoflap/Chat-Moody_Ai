import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Terminal as TerminalIcon, 
  Sliders, 
  Share2, 
  Wifi, 
  WifiOff, 
  Sun, 
  Moon, 
  Contrast, 
  MessageSquare,
  Lock,
  RefreshCw,
  Plus,
  Trash2
} from 'lucide-react';
import { generateMasterKey, exportKeyToBase64, encryptText, decryptText } from './lib/crypto';
import { dbPut, dbGetAll, dbDelete, dbClear, type StoredSession, type StoredFile } from './lib/storage';
import type { ChatMessage, GeminiModelId } from './types';
import { ChatInterface } from './components/ChatInterface';
import { AdminTerminal } from './components/AdminTerminal';
import { PrivacyDashboard } from './components/PrivacyDashboard';
import { FileSharing } from './components/FileSharing';
import { UniversalInstallModal } from './components/UniversalInstallModal';
import { UserPreferences, DEFAULT_USER_CONFIG, type UserPersonalizationConfig } from './components/UserPreferences';
import { AgentZeroStudio } from './components/AgentZeroStudio';
import { LanPeerConnect } from './components/LanPeerConnect';
import { Simple3DStudio } from './components/Simple3DStudio';
import { DEFAULT_AGENT_ZERO_CONFIG } from './lib/modelsCatalog';
import { Download, Wrench, Workflow, Network, Box } from 'lucide-react';

export default function App() {
  // Navigation tabs
  const [activeView, setActiveView] = useState<'chat' | 'terminal' | 'privacy' | 'files' | 'preferences' | 'agentzero' | 'lan' | '3dstudio'>('chat');
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Agent Zero Multi-Agent configuration
  const [agentZeroConfig, setAgentZeroConfig] = useState(() => {
    const saved = localStorage.getItem('kluis_agent_zero');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return DEFAULT_AGENT_ZERO_CONFIG;
  });

  // User Admin customization config (Every user is admin)
  const [userConfig, setUserConfig] = useState<UserPersonalizationConfig>(() => {
    const saved = localStorage.getItem('kluis_user_config');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return DEFAULT_USER_CONFIG;
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);

  // Network & Sync status
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wsConnected, setWsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  // Cryptographic Keys
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [masterKeyBase64, setMasterKeyBase64] = useState<string | null>(null);

  // Sessions and Chat state
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('default_session');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  // Model & voice config state
  const [selectedModel, setSelectedModel] = useState<GeminiModelId>('gemini-4-hydrogen');
  const [targetLanguage, setTargetLanguage] = useState<string>('nl-NL');
  const [isDutchVoiceEnabled, setIsDutchVoiceEnabled] = useState(true);

  // Encrypted shared files
  const [files, setFiles] = useState<StoredFile[]>([]);

  // 1. Initialize or Load Master Encryption Key
  useEffect(() => {
    async function initKey() {
      let savedKey = localStorage.getItem('kluis_master_key');
      let key: CryptoKey;
      if (savedKey) {
        try {
          const raw = Uint8Array.from(atob(savedKey), c => c.charCodeAt(0));
          key = await window.crypto.subtle.importKey(
            'raw',
            raw,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
          );
        } catch {
          key = await generateMasterKey();
          savedKey = await exportKeyToBase64(key);
          localStorage.setItem('kluis_master_key', savedKey);
        }
      } else {
        key = await generateMasterKey();
        savedKey = await exportKeyToBase64(key);
        localStorage.setItem('kluis_master_key', savedKey);
      }
      setMasterKey(key);
      setMasterKeyBase64(savedKey);
    }
    initKey();
  }, []);

  // 2. Network connectivity listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 3. Connect WebSocket for Real-time Synchronization
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = async (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data.type === 'file:shared' && masterKey) {
            setFiles(prev => {
              if (prev.some(f => f.id === data.payload.id)) return prev;
              return [data.payload, ...prev];
            });
          } else if (data.type === 'file:deleted') {
            setFiles(prev => prev.filter(f => f.id !== data.payload.id));
          } else if (data.type === 'chat:synced' && masterKey) {
            // Receive encrypted session from another connected device
            const incoming = data.payload;
            try {
              const decryptedStr = await decryptText(JSON.parse(incoming.encryptedMessages), masterKey);
              const syncedMessages = JSON.parse(decryptedStr);
              if (incoming.id === currentSessionId) {
                setMessages(syncedMessages);
              }
            } catch {
              // Different key fingerprint, ignore
            }
          }
        } catch (e) {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
      };
    } catch (e) {
      console.warn('WS connection setup failed:', e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [masterKey, currentSessionId]);

  // 4. Load initial Sessions & Files from local IndexedDB and server
  useEffect(() => {
    async function loadData() {
      if (!masterKey) return;
      try {
        const storedSessions = await dbGetAll<StoredSession>('sessions');
        setSessions(storedSessions);

        if (storedSessions.length > 0) {
          const defaultSes = storedSessions[0];
          setCurrentSessionId(defaultSes.id);
          try {
            const dec = await decryptText(JSON.parse(defaultSes.encryptedMessages), masterKey);
            setMessages(JSON.parse(dec));
          } catch {
            setMessages([]);
          }
        }

        // Fetch shared files from server or local
        const localFiles = await dbGetAll<StoredFile>('encrypted_files');
        try {
          const res = await fetch('/api/files');
          if (res.ok) {
            const data = await res.json();
            setFiles(data.files || localFiles);
          } else {
            setFiles(localFiles);
          }
        } catch {
          setFiles(localFiles);
        }
      } catch (e) {
        console.error('Storage load failed:', e);
      }
    }
    loadData();
  }, [masterKey]);

  // 5. Dark mode & Contrast class application on root element
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    if (isHighContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }, [isDarkMode, isHighContrast]);

  // Handle sending a chat message to Gemini
  const handleSendMessage = async (
    text: string, 
    options: { model: GeminiModelId; targetLanguage: string; generateSpeech: boolean }
  ) => {
    if (!masterKey) return;

    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      isEncrypted: true,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoadingChat(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          model: options.model,
          targetLanguage: options.targetLanguage,
          generateSpeech: options.generateSpeech,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Server error');
      }

      const data = await res.json();
      const assistantMessage: ChatMessage = {
        id: 'msg_' + Date.now() + '_res',
        role: 'model',
        content: data.reply,
        timestamp: data.timestamp || Date.now(),
        audioWavBase64: data.audioWavBase64,
        isEncrypted: true,
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      // Encrypt and persist to local IndexedDB (zero-knowledge)
      const encryptedPayload = await encryptText(JSON.stringify(finalMessages), masterKey);
      const sessionObj: StoredSession = {
        id: currentSessionId,
        title: text.slice(0, 30) || 'Nederlandse Conversatie',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        model: options.model,
        sourceLanguage: 'nl-NL',
        targetLanguage: options.targetLanguage,
        encryptedMessages: JSON.stringify(encryptedPayload),
      };

      await dbPut('sessions', sessionObj);
      setSessions(prev => {
        const idx = prev.findIndex(s => s.id === currentSessionId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = sessionObj;
          return next;
        }
        return [sessionObj, ...prev];
      });

      // Synchronize encrypted payload across peers if WebSocket connected
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'chat:sync',
          payload: sessionObj,
        }));
      }
    } catch (err: any) {
      console.error('Chat request failed:', err);
      const errorMessage: ChatMessage = {
        id: 'msg_err_' + Date.now(),
        role: 'model',
        content: `Fout bij verwerken verzoek: ${err.message || 'Geen verbinding met Gemini server'}. Controleer netwerk of API sleutel.`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  const createNewSession = () => {
    const newId = 'session_' + Date.now();
    setCurrentSessionId(newId);
    setMessages([]);
  };

  const switchSession = async (session: StoredSession) => {
    if (!masterKey) return;
    setCurrentSessionId(session.id);
    try {
      const dec = await decryptText(JSON.parse(session.encryptedMessages), masterKey);
      setMessages(JSON.parse(dec));
    } catch {
      setMessages([]);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await dbDelete('sessions', sessionId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      createNewSession();
    }
  };

  const handleClearAllHistory = async () => {
    await dbClear('sessions');
    await dbClear('encrypted_files');
    setSessions([]);
    setMessages([]);
    setFiles([]);
    createNewSession();
  };

  const handleRotateLocalKey = async () => {
    const newKey = await generateMasterKey();
    const newKeyBase64 = await exportKeyToBase64(newKey);
    localStorage.setItem('kluis_master_key', newKeyBase64);
    setMasterKey(newKey);
    setMasterKeyBase64(newKeyBase64);

    // Re-encrypt current messages
    if (messages.length > 0) {
      const encrypted = await encryptText(JSON.stringify(messages), newKey);
      await dbPut('sessions', {
        id: currentSessionId,
        title: 'Geroteerde Sessie',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        model: selectedModel,
        sourceLanguage: 'nl-NL',
        targetLanguage,
        encryptedMessages: JSON.stringify(encrypted),
      });
    }
  };

  const handleUploadFile = async (newFile: StoredFile) => {
    await dbPut('encrypted_files', newFile);
    setFiles(prev => [newFile, ...prev]);

    // Send to backend sync relay
    try {
      await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFile),
      });
    } catch (e) {
      console.warn('Sync relay unreachable; cached locally:', e);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    await dbDelete('encrypted_files', fileId);
    setFiles(prev => prev.filter(f => f.id !== fileId));
    try {
      await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
    } catch {
      // offline fallback
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 select-none">
      {/* Primary Sidebar (Zero-Pill, Dense, Accessible) */}
      <aside className="w-64 md:w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
        {/* Brand Lockup: Moody.Ai */}
        <div className="p-3.5 border-b border-slate-300 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-600 text-white font-bold text-sm tracking-wider shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 block">
                Moody.Ai
              </span>
              <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 block -mt-0.5 font-semibold">
                SOVEREIGN INTELLIGENCE
              </span>
            </div>
          </div>
          <span className="led-sq led-sq-active" title="System Online" />
        </div>

        {/* Navigation Section */}
        <div className="p-3 space-y-1 border-b border-slate-200 dark:border-slate-800 text-xs">
          <button
            onClick={() => setActiveView('chat')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition text-left ${
              activeView === 'chat'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Gemini Chat & Stem</span>
          </button>

          <button
            onClick={() => setActiveView('terminal')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition text-left ${
              activeView === 'terminal'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
            }`}
          >
            <TerminalIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Admin Terminal</span>
          </button>

          <button
            onClick={() => setActiveView('privacy')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition text-left ${
              activeView === 'privacy'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
            }`}
          >
            <Sliders className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Privacy Dashboard</span>
          </button>

          <button
            onClick={() => setActiveView('files')}
            className={`btn-neon w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition text-left text-xs ${
              activeView === 'files'
                ? 'btn-neon-active font-semibold'
                : 'text-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <span>E2EE Bestanden</span>
            </div>
            <span className={`led-sq ${files.length > 0 ? 'led-sq-active' : 'led-sq-inactive'}`} />
          </button>

          {/* LAN Peer Connect (Colleague Pairing) */}
          <button
            onClick={() => setActiveView('lan')}
            className={`btn-neon w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition text-left text-xs ${
              activeView === 'lan'
                ? 'btn-neon-active font-semibold'
                : 'text-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>LAN Collega Koppelen</span>
            </div>
            <span className="led-sq led-sq-amber" />
          </button>

          <button
            onClick={() => setActiveView('agentzero')}
            className={`btn-neon w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition text-left text-xs ${
              activeView === 'agentzero'
                ? 'btn-neon-active font-semibold'
                : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Workflow className="w-4 h-4 text-emerald-400" />
              <span>Agent Zero Multi-Agent</span>
            </div>
            <span className={`led-sq ${agentZeroConfig.enabled ? 'led-sq-active' : 'led-sq-inactive'}`} />
          </button>

          {/* 3D Creation Studio (Sketch/Photo to 3D) */}
          <button
            onClick={() => setActiveView('3dstudio')}
            className={`btn-neon w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition text-left text-xs ${
              activeView === '3dstudio'
                ? 'btn-neon-active font-semibold'
                : 'text-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-emerald-500" />
              <span>3D Creatie Studio</span>
            </div>
            <span className="led-sq led-sq-active" />
          </button>

          <button
            onClick={() => setActiveView('preferences')}
            className={`btn-neon w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition text-left text-xs ${
              activeView === 'preferences'
                ? 'btn-neon-active font-semibold'
                : 'text-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-emerald-400" />
              <span>Mijn Admin Rechten</span>
            </div>
            <span className="led-sq led-sq-active" />
          </button>

          {/* Universal Desktop & Browser Install Button */}
          <div className="pt-2">
            <button
              onClick={() => setShowInstallModal(true)}
              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-sm transition flex items-center justify-center gap-2 text-xs"
            >
              <Download className="w-4 h-4" />
              <span>Installeer App</span>
            </button>
          </div>
        </div>

        {/* Sessions Vault List (When in Chat view) */}
        {activeView === 'chat' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
                Versleutelde Sessies
              </span>
              <button
                onClick={createNewSession}
                className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Start nieuwe versleutelde sessie"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              {sessions.length === 0 ? (
                <div className="p-3 text-[11px] text-slate-400 text-center italic">
                  Geen opgeslagen sessies
                </div>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => switchSession(s)}
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition ${
                      currentSessionId === s.id
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-medium border border-emerald-200 dark:border-emerald-800'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="truncate flex-1 pr-2">
                      <span className="block truncate">{s.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(s.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(s.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition"
                      title="Verwijder sessie"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Global Security & Accessibility Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs">
          {/* Connection & Offline Status */}
          <div className="flex items-center justify-between px-1">
            <span className="flex items-center gap-1.5 text-[11px]">
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-slate-600 dark:text-slate-400">Verbonden ({wsConnected ? 'Live Sync' : 'HTTP'})</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Offline Kluis Modus</span>
                </>
              )}
            </span>
            <span className="font-mono text-[10px] text-slate-400">AMS-01</span>
          </div>

          {/* Accessibility Toggles: Theme and High-Contrast */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 rounded text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              title="Wissel Donker / Licht Thema"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setIsHighContrast(!isHighContrast)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition ${
                isHighContrast
                  ? 'bg-black text-white dark:bg-white dark:text-black font-bold ring-2 ring-emerald-500'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
              title="Schakel Hoog Contrast Modus in voor toegankelijkheid"
              aria-label="Toggle high contrast display mode"
            >
              <Contrast className="w-3.5 h-3.5" />
              <span>Hoog Contrast</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900">
        {activeView === 'chat' && (
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoadingChat}
            isHighContrast={isHighContrast}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            targetLanguage={targetLanguage}
            onLanguageChange={setTargetLanguage}
            isDutchVoiceEnabled={isDutchVoiceEnabled}
            onToggleDutchVoice={setIsDutchVoiceEnabled}
          />
        )}

        {activeView === 'terminal' && (
          <div className="p-4 md:p-6 h-full overflow-hidden">
            <AdminTerminal
              socket={socketRef.current}
              isHighContrast={isHighContrast}
              onAuditRecorded={(action) => {
                fetch('/api/admin/audit-log', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    eventType: 'ADMIN_ACCESS',
                    severity: 'INFO',
                    description: action,
                    actor: 'Master Admin Console',
                  }),
                }).catch(() => {});
              }}
            />
          </div>
        )}

        {activeView === 'privacy' && (
          <div className="p-4 md:p-6 h-full overflow-y-auto">
            <PrivacyDashboard
              onClearLocalHistory={handleClearAllHistory}
              totalEncryptedSessions={sessions.length}
              totalEncryptedFiles={files.length}
              masterKeyBase64={masterKeyBase64}
              onRotateLocalKey={handleRotateLocalKey}
              isHighContrast={isHighContrast}
            />
          </div>
        )}

        {activeView === 'files' && (
          <div className="p-4 md:p-6 h-full overflow-y-auto">
            <FileSharing
              files={files}
              masterKey={masterKey}
              onUploadEncryptedFile={handleUploadFile}
              onDeleteFile={handleDeleteFile}
              isHighContrast={isHighContrast}
            />
          </div>
        )}

        {activeView === 'preferences' && (
          <div className="p-4 md:p-6 h-full overflow-y-auto">
            <UserPreferences
              config={userConfig}
              onSaveConfig={(updated) => {
                setUserConfig(updated);
                localStorage.setItem('kluis_user_config', JSON.stringify(updated));
                setSelectedModel(updated.defaultModel);
                setTargetLanguage(updated.defaultLanguage);
              }}
              isHighContrast={isHighContrast}
            />
          </div>
        )}

        {activeView === 'agentzero' && (
          <div className="p-4 md:p-6 h-full overflow-y-auto">
            <AgentZeroStudio
              config={agentZeroConfig}
              onUpdateConfig={(updated) => {
                setAgentZeroConfig(updated);
                localStorage.setItem('kluis_agent_zero', JSON.stringify(updated));
              }}
              isHighContrast={isHighContrast}
            />
          </div>
        )}

        {activeView === 'lan' && (
          <div className="p-4 md:p-6 h-full overflow-y-auto">
            <LanPeerConnect
              socket={socketRef.current}
              isHighContrast={isHighContrast}
            />
          </div>
        )}

        {activeView === '3dstudio' && (
          <div className="p-4 md:p-6 h-full overflow-y-auto">
            <Simple3DStudio
              isHighContrast={isHighContrast}
            />
          </div>
        )}
      </main>

      {/* Universal Desktop & OS Install Modal */}
      <UniversalInstallModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />
    </div>
  );
}
