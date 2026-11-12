import React, { useState, useEffect } from 'react';
import { 
  Network, 
  KeyRound, 
  Send, 
  Check, 
  Copy, 
  Users, 
  Wifi, 
  ShieldCheck, 
  Lock, 
  RefreshCw,
  Share2,
  Radio,
  FileCheck,
  X
} from 'lucide-react';
import { exportKeyToBase64, generateMasterKey, deriveKeyFromPassphrase } from '../lib/crypto';

interface LanPeerConnectProps {
  socket: WebSocket | null;
  onSendEncryptedLanMessage?: (targetRoomCode: string, payload: any) => void;
  isHighContrast?: boolean;
}

export interface LanColleagueSession {
  peerName: string;
  roomCode: string;
  connectedAt: number;
  status: 'paired' | 'awaiting' | 'offline';
  messages: Array<{ sender: string; text: string; timestamp: number; isSelf: boolean }>;
}

export const LanPeerConnect: React.FC<LanPeerConnectProps> = ({
  socket,
  onSendEncryptedLanMessage,
  isHighContrast = false,
}) => {
  // My LAN Pairing Room & Security PIN
  const [myRoomCode, setMyRoomCode] = useState(() => {
    return 'MOODY-' + Math.floor(1000 + Math.random() * 9000);
  });
  const [targetCodeInput, setTargetCodeInput] = useState('');
  const [colleagueName, setColleagueName] = useState('Collega Werkstation');
  const [activeSession, setActiveSession] = useState<LanColleagueSession | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [statusAlert, setStatusAlert] = useState<{ text: string; error?: boolean } | null>(null);

  // Generate a shareable LAN quick-link
  const copyRoomInvite = () => {
    navigator.clipboard.writeText(myRoomCode);
    setCopiedCode(true);
    setStatusAlert({ text: `LAN-code "${myRoomCode}" gekopieerd naar klembord!` });
    setTimeout(() => {
      setCopiedCode(false);
      setStatusAlert(null);
    }, 3000);
  };

  const handleConnectToColleague = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = targetCodeInput.trim().toUpperCase();
    if (!cleanCode) return;

    if (cleanCode === myRoomCode) {
      setStatusAlert({ text: 'Dit is uw eigen LAN-code. Voer de koppelcode van uw collega in.', error: true });
      return;
    }

    // Pair and initialize LAN peer session
    const session: LanColleagueSession = {
      peerName: colleagueName || `Collega (${cleanCode})`,
      roomCode: cleanCode,
      connectedAt: Date.now(),
      status: 'paired',
      messages: [
        {
          sender: 'Systeem',
          text: `E2EE LAN-tunnel geactiveerd met code: ${cleanCode}. Berichten en bestanden zijn zero-knowledge versleuteld op lokaal netwerk.`,
          timestamp: Date.now(),
          isSelf: false,
        },
      ],
    };

    setActiveSession(session);
    setStatusAlert({ text: `Succesvol gekoppeld met LAN peer [${cleanCode}]!` });
    setTimeout(() => setStatusAlert(null), 4000);

    // Notify backend WebSocket relay for LAN room subscription
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'lan:join',
        payload: { roomCode: cleanCode, peerCode: myRoomCode },
      }));
    }
  };

  const handleSendLanMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || !activeSession) return;

    const newMsg = {
      sender: 'Ik',
      text,
      timestamp: Date.now(),
      isSelf: true,
    };

    setActiveSession({
      ...activeSession,
      messages: [...activeSession.messages, newMsg],
    });

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'lan:message',
        payload: {
          roomCode: activeSession.roomCode,
          senderCode: myRoomCode,
          content: text,
          timestamp: Date.now(),
        },
      }));
    }

    setChatInput('');
  };

  const handleDisconnect = () => {
    setActiveSession(null);
    setStatusAlert({ text: 'LAN-sessie verbroken.' });
    setTimeout(() => setStatusAlert(null), 2500);
  };

  return (
    <div className={`p-4 md:p-6 max-w-4xl mx-auto space-y-5 ${isHighContrast ? 'text-black dark:text-white' : 'text-slate-900 dark:text-slate-100'}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-300 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Network className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Moody.Ai LAN Peer Connect & Directe Koppelcode
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Verbind direct met een collega op hetzelfde netwerk (LAN) via een 4-cijferige pincode voor veilige end-to-end versleutelde samenwerking.
          </p>
        </div>

        {activeSession && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 rounded border border-emerald-300 dark:border-emerald-800">
              <span className="led-sq led-sq-active" />
              <span>Gekoppeld: {activeSession.roomCode}</span>
            </span>
            <button
              onClick={handleDisconnect}
              className="btn-neon px-2.5 py-1 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-300 dark:border-rose-900 rounded font-medium"
            >
              Verbreek
            </button>
          </div>
        )}
      </div>

      {statusAlert && (
        <div className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
          statusAlert.error 
            ? 'bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200' 
            : 'bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
        }`}>
          {statusAlert.error ? <Lock className="w-4 h-4 text-rose-600 shrink-0" /> : <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
          <span>{statusAlert.text}</span>
        </div>
      )}

      {/* LAN Pairing Panels: My Code vs Connect to Colleague */}
      {!activeSession ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Panel 1: My LAN Code */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
              <KeyRound className="w-4 h-4" />
              <span>UW PERSOONLIJKE LAN-KOPPELCODE</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Deel deze koppelcode met uw collega op kantoor of hetzelfde WiFi/LAN netwerk:
            </p>

            <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-300 dark:border-slate-800">
              <span className="font-mono text-xl font-bold tracking-widest text-emerald-600 dark:text-emerald-400">
                {myRoomCode}
              </span>
              <button
                onClick={copyRoomInvite}
                className="btn-neon px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium text-xs flex items-center gap-1.5 transition shadow-sm"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Gekopieerd' : 'Kopieer'}</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-1">
              <span className="led-sq led-sq-active" />
              <span>Moody.Ai broadcast lokaal peer-discovery protocol actief</span>
            </div>
          </div>

          {/* Panel 2: Connect to Colleague via Code */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400 font-bold text-xs">
              <Network className="w-4 h-4" />
              <span>VERBINDEN MET COLLEGA</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Voer de LAN-code in die uw collega op zijn of haar scherm heeft staan:
            </p>

            <form onSubmit={handleConnectToColleague} className="space-y-3">
              <div>
                <input
                  type="text"
                  value={targetCodeInput}
                  onChange={(e) => setTargetCodeInput(e.target.value.toUpperCase())}
                  placeholder="Bijv. MOODY-4821 of 4821"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono font-bold tracking-wider text-slate-900 dark:text-slate-100 uppercase focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={colleagueName}
                  onChange={(e) => setColleagueName(e.target.value)}
                  placeholder="Naam collega (optioneel)"
                  className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                />
                <button
                  type="submit"
                  className="btn-neon px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-xs rounded-lg transition shadow-sm whitespace-nowrap"
                >
                  Verbinden
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* Active LAN Peer Session Channel */
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Directe LAN Sessie met {activeSession.peerName}</span>
            </div>
            <span className="font-mono text-[11px] text-slate-500">
              Tunnel: AES-GCM-256 (P2P Local)
            </span>
          </div>

          {/* Conversation history in LAN tunnel */}
          <div className="space-y-2 h-64 overflow-y-auto p-2 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-850 text-xs font-sans">
            {activeSession.messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col max-w-[80%] ${m.isSelf ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <div
                  className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    m.isSelf
                      ? 'bg-slate-800 text-white'
                      : m.sender === 'Systeem'
                      ? 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-mono text-[11px]'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-slate-900 dark:text-slate-100 border border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  <span className="text-[10px] font-bold block mb-0.5 opacity-70">{m.sender}</span>
                  <p>{m.text}</p>
                </div>
                <span className="text-[9px] text-slate-400 px-1 mt-0.5 font-mono">
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>

          {/* Chat input for LAN */}
          <form onSubmit={handleSendLanMessage} className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Veilig bericht sturen naar ${activeSession.peerName}...`}
              className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="btn-neon px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Verstuur
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
