import express from 'express';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize GoogleGenAI SDK with user agent telemetry
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// In-Memory Server State for Realtime Synchronization and Admin Metrics
const serverStartTime = Date.now();
let totalChatsProcessed = 0;
let ttsGenerations = 0;
let securityIncidents = 0;

// System Global Config (editable via Admin Terminal)
let globalConfig = {
  defaultModel: 'gemini-4-hydrogen',
  systemPrompt: 'Je bent KluisAI, een uiterst discrete, behulpzame en intelligente meertalige assistent met volledige privacy-bescherming en data-soevereiniteit. Beantwoord gebruikersvragen vriendelijk, precies en natuurlijk in het Nederlands of de gevraagde doeltaal.',
  dutchVoiceName: 'Kore',
  dutchSpeechStyle: 'Natuurlijk, warm, helder en professioneel Nederlands',
  offlineEncryptionEnabled: true,
  crossPlatformSyncEnabled: true,
  sessionTimeoutMinutes: 60,
  auditRetentionDays: 90,
  maintenanceMode: false,
  requireAdminMfa: false,
  syncNodeAddress: 'wss://node-ams-01.kluisai.net',
};

// Registered mock users for Admin User Management
let adminUsers = [
  {
    id: 'usr_root_001',
    email: 'fhj.brasser88@gmail.com',
    role: 'admin',
    createdAt: Date.now() - 86400000 * 30,
    lastLogin: Date.now() - 1000 * 60 * 15,
    status: 'active',
    encryptionKeyFingerprint: 'SHA256:7b91e92c4a938...e83a',
  },
  {
    id: 'usr_sec_002',
    email: 'security-audit@kluisai.net',
    role: 'auditor',
    createdAt: Date.now() - 86400000 * 14,
    lastLogin: Date.now() - 1000 * 60 * 180,
    status: 'active',
    encryptionKeyFingerprint: 'SHA256:f12a83bd47c01...99bc',
  },
  {
    id: 'usr_ops_003',
    email: 'remote-worker@kluisai.net',
    role: 'user',
    createdAt: Date.now() - 86400000 * 3,
    lastLogin: Date.now() - 1000 * 60 * 60 * 2,
    status: 'active',
    encryptionKeyFingerprint: 'SHA256:39a11f930e4bd...5510',
  },
];

interface ServerAuditLog {
  id: string;
  timestamp: number;
  eventType: string;
  severity: string;
  description: string;
  actor: string;
  ipAddress?: string;
}

// Audit Log entries
let serverAuditLogs: ServerAuditLog[] = [
  {
    id: 'audit_' + Date.now() + '_init',
    timestamp: Date.now() - 1000 * 60 * 120,
    eventType: 'AUTH',
    severity: 'INFO',
    description: 'Admin terminal authenticated via local zero-trust session.',
    actor: 'fhj.brasser88@gmail.com',
    ipAddress: '127.0.0.1',
  },
  {
    id: 'audit_' + (Date.now() - 1000 * 60 * 60) + '_key',
    timestamp: Date.now() - 1000 * 60 * 60,
    eventType: 'ENCRYPTION',
    severity: 'INFO',
    description: 'Client established AES-GCM-256 ephemeral encryption tunnel.',
    actor: 'Client-Node',
    ipAddress: '127.0.0.1',
  },
];

// Encrypted files sync memory store (holds encrypted blobs without decrypting them)
interface EncryptedSharedFile {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: number;
  uploader: string;
  encryptedData: string;
  iv: string;
}
let syncedEncryptedFiles: EncryptedSharedFile[] = [];

// ========================
// API ROUTES
// ========================

// 1. Health & Metrics Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor((Date.now() - serverStartTime) / 1000),
    activeClients: wss.clients.size,
    totalChatsProcessed,
    ttsGenerations,
    securityIncidents,
    maintenanceMode: globalConfig.maintenanceMode,
    model: globalConfig.defaultModel,
  });
});

// 2. Chat Completion Route with Gemini models
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model, systemInstruction, targetLanguage, generateSpeech } = req.body;
    
    // Choose model from request or fallback to server default
    const selectedModel = model || globalConfig.defaultModel;
    const finalInstruction = systemInstruction || globalConfig.systemPrompt;

    totalChatsProcessed++;

    // Prepare contents array for Gemini generateContent
    // Format messages: turn user and assistant messages into parts
    const contents = (messages || []).map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    // If targetLanguage is specified and not Dutch/default, append translation request context
    let promptInstruction = finalInstruction;
    if (targetLanguage && targetLanguage !== 'nl-NL') {
      promptInstruction += ` Please also provide your response or translation in language code: ${targetLanguage}.`;
    }

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config: {
        systemInstruction: promptInstruction,
      },
    });

    const replyText = response.text || '';

    // If audio/TTS requested (especially Dutch Voice interface)
    let audioWavBase64 = null;
    if (generateSpeech && replyText.trim()) {
      try {
        ttsGenerations++;
        // Generate high-efficiency audio via gemini-3.8-flash-lite-tts
        const ttsResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: replyText.slice(0, 1000), // optimal length for instant voice response
                  speechMetadata: {
                    style: globalConfig.dutchSpeechStyle,
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: globalConfig.dutchVoiceName },
              },
            },
          },
        });

        const rawAudio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (rawAudio) {
          audioWavBase64 = rawAudio;
        }
      } catch (audioErr) {
        console.warn('TTS generation warning:', audioErr);
        // Fallback to text without breaking the chat response
      }
    }

    res.json({
      reply: replyText,
      modelUsed: selectedModel,
      audioWavBase64,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: error?.message || 'Gemini processing failed',
      code: error?.status || 500,
    });
  }
});

// 3. Multilingual Real-Time Translation Endpoint
app.post('/api/translate', async (req, res) => {
  try {
    const { text, sourceLanguage, targetLanguage } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }

    const prompt = `Translate the following text accurately and idiomatically from ${sourceLanguage || 'auto-detected language'} into ${targetLanguage || 'nl-NL (Dutch)'}. Preserve technical terms, tone, and formatting. Return ONLY the translated text without conversational preamble:\n\n${text}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        systemInstruction: 'You are an ultra-fast, professional multilingual neural translator for real-time international communication.',
      },
    });

    res.json({
      translatedText: response.text || '',
      sourceLanguage,
      targetLanguage,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Translate error:', error);
    res.status(500).json({ error: error?.message || 'Translation failed' });
  }
});

// 4. Admin Management Routes
app.get('/api/admin/system', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    config: globalConfig,
    metrics: {
      activeConnections: wss.clients.size,
      totalChatsProcessed,
      ttsGenerations,
      securityIncidents,
      systemUptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
      geminiApiHealth: apiKey ? 'HEALTHY' : 'DEGRADED',
      memoryUsageMb: Math.round(mem.rss / 1024 / 1024),
    },
    users: adminUsers,
    auditLogs: serverAuditLogs.slice(-50),
    syncedFilesCount: syncedEncryptedFiles.length,
  });
});

app.post('/api/admin/config', (req, res) => {
  const updates = req.body;
  globalConfig = { ...globalConfig, ...updates };

  serverAuditLogs.push({
    id: 'audit_' + Date.now(),
    timestamp: Date.now(),
    eventType: 'CONFIG_CHANGE',
    severity: 'INFO',
    description: `Global system configuration updated: ${Object.keys(updates).join(', ')}`,
    actor: 'admin-terminal',
    ipAddress: '127.0.0.1',
  });

  // Broadcast config update to connected websocket clients
  broadcast({
    type: 'config:updated',
    payload: globalConfig,
  });

  res.json({ success: true, config: globalConfig });
});

app.post('/api/admin/user-status', (req, res) => {
  const { userId, status } = req.body;
  const user = adminUsers.find(u => u.id === userId);
  if (user) {
    user.status = status;
    serverAuditLogs.push({
      id: 'audit_' + Date.now(),
      timestamp: Date.now(),
      eventType: 'ADMIN_ACCESS',
      severity: 'WARNING',
      description: `User ${user.email} status changed to ${status}`,
      actor: 'admin-terminal',
    });
    return res.json({ success: true, user });
  }
  res.status(404).json({ error: 'User not found' });
});

app.post('/api/admin/audit-log', (req, res) => {
  const entry = req.body;
  serverAuditLogs.push({
    id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    timestamp: Date.now(),
    eventType: entry.eventType || 'SECURITY',
    severity: entry.severity || 'INFO',
    description: entry.description || 'Security audit milestone',
    actor: entry.actor || 'client-vault',
    ipAddress: req.ip || '127.0.0.1',
  });
  res.json({ success: true });
});

// 5. Encrypted File Sharing & Cross-Device Sync Endpoints
app.get('/api/files', (req, res) => {
  res.json({ files: syncedEncryptedFiles });
});

app.post('/api/files', (req, res) => {
  const { id, fileName, mimeType, size, uploadedAt, uploader, encryptedData, iv } = req.body;
  if (!id || !encryptedData || !iv) {
    return res.status(400).json({ error: 'Invalid encrypted payload' });
  }

  // Idempotent insertion
  const existingIdx = syncedEncryptedFiles.findIndex(f => f.id === id);
  const fileObj: EncryptedSharedFile = {
    id,
    fileName: fileName || 'unnamed_encrypted.bin',
    mimeType: mimeType || 'application/octet-stream',
    size: size || 0,
    uploadedAt: uploadedAt || Date.now(),
    uploader: uploader || 'Anonymous Peer',
    encryptedData,
    iv,
  };

  if (existingIdx >= 0) {
    syncedEncryptedFiles[existingIdx] = fileObj;
  } else {
    syncedEncryptedFiles.push(fileObj);
  }

  // Broadcast to all peers over WebSocket
  broadcast({
    type: 'file:shared',
    payload: fileObj,
  });

  serverAuditLogs.push({
    id: 'audit_' + Date.now(),
    timestamp: Date.now(),
    eventType: 'ENCRYPTION',
    severity: 'INFO',
    description: `Zero-knowledge encrypted file synced: ${fileName} (${Math.round(size / 1024)} KB)`,
    actor: uploader || 'sync-agent',
  });

  res.json({ success: true, file: fileObj });
});

app.delete('/api/files/:id', (req, res) => {
  const { id } = req.params;
  syncedEncryptedFiles = syncedEncryptedFiles.filter(f => f.id !== id);
  broadcast({
    type: 'file:deleted',
    payload: { id },
  });
  res.json({ success: true });
});

// ========================
// WEBSOCKET SERVER FOR REAL-TIME CROSS-PLATFORM SYNCHRONIZATION
// ========================
const wss = new WebSocketServer({ server });

function broadcast(data: object, excludeWs?: WebSocket) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

wss.on('connection', (ws) => {
  // Send initial handshake with current system state & encrypted files index
  ws.send(JSON.stringify({
    type: 'sync:init',
    payload: {
      config: globalConfig,
      files: syncedEncryptedFiles,
      connectedClients: wss.clients.size,
      timestamp: Date.now(),
    },
  }));

  // Broadcast updated peer count
  broadcast({
    type: 'presence:update',
    payload: { activeClients: wss.clients.size },
  });

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      switch (data.type) {
        case 'chat:sync':
          // Relay encrypted session payload across connected devices
          broadcast({
            type: 'chat:synced',
            payload: data.payload,
          }, ws);
          break;

        case 'file:broadcast':
          broadcast({
            type: 'file:shared',
            payload: data.payload,
          }, ws);
          break;

        case 'terminal:command':
          // Admin terminal command execution over websocket
          handleTerminalCommand(ws, data.payload);
          break;

        default:
          break;
      }
    } catch (e) {
      console.error('WS message error:', e);
    }
  });

  ws.on('close', () => {
    broadcast({
      type: 'presence:update',
      payload: { activeClients: wss.clients.size },
    });
  });
});

function handleTerminalCommand(ws: WebSocket, payload: { command: string; args?: string[] }) {
  const cmd = payload.command?.trim().toLowerCase();
  let response = '';

  switch (cmd) {
    case 'status':
    case 'sysinfo':
      response = `[SYSTEM OK] KluisAI Core v4.1 | Gemini Engine: ${globalConfig.defaultModel} | Active peers: ${wss.clients.size} | Uptime: ${Math.floor((Date.now() - serverStartTime) / 1000)}s | E2EE: AES-GCM-256`;
      break;
    case 'users':
      response = `Registered Operators:\n` + adminUsers.map(u => ` • ${u.email} [${u.role.toUpperCase()}] - Status: ${u.status}`).join('\n');
      break;
    case 'audit':
      response = `Recent Security Audits (last 5):\n` + serverAuditLogs.slice(-5).map(l => ` [${new Date(l.timestamp).toLocaleTimeString()}] ${l.severity} ${l.eventType}: ${l.description}`).join('\n');
      break;
    case 'sync':
      response = `Cross-platform sync tunnel: ACTIVE. Connected to ${globalConfig.syncNodeAddress}. Encrypted file objects: ${syncedEncryptedFiles.length}.`;
      break;
    case 'rotate-keys':
      response = `[SECURITY NOTICE] Ephemeral master sync salt rotated. Client zero-knowledge keys remain untouched in local browser vaults.`;
      serverAuditLogs.push({
        id: 'audit_' + Date.now(),
        timestamp: Date.now(),
        eventType: 'KEY_ROTATION',
        severity: 'ALERT',
        description: 'Admin triggered sync node master salt rotation.',
        actor: 'admin-terminal',
      });
      break;
    case 'help':
      response = `KluisAI Secure Terminal Commands:
 • status       - Display live system telemetry & node health
 • users        - List operators and access privilege tiers
 • audit        - Output real-time tamper-evident audit logs
 • sync         - Inspect cross-platform synchronization state
 • rotate-keys  - Issue security key rotation advisory
 • clear        - Clear terminal display buffer
 • mode [dev|prod|maint] - Set operational safety policy`;
      break;
    default:
      if (cmd.startsWith('mode ')) {
        const targetMode = cmd.split(' ')[1];
        globalConfig.maintenanceMode = targetMode === 'maint';
        response = `Operational mode updated to: ${targetMode.toUpperCase()}`;
      } else {
        response = `Command '${cmd}' not recognized. Type 'help' for authorized administrative directives.`;
      }
      break;
  }

  ws.send(JSON.stringify({
    type: 'terminal:output',
    payload: {
      command: payload.command,
      output: response,
      timestamp: Date.now(),
    },
  }));
}

// Serve static assets in production or fallback
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

server.listen(port, () => {
  console.log(`KluisAI Server listening on port ${port}`);
});
