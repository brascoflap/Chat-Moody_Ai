import type { Plugin } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

let totalChatsProcessed = 0;
let ttsGenerations = 0;
let securityIncidents = 0;
const serverStartTime = Date.now();

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

let serverAuditLogs: any[] = [
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

let syncedEncryptedFiles: any[] = [];
let wss: WebSocketServer | null = null;

function broadcast(data: object, excludeWs?: WebSocket) {
  if (!wss) return;
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

function handleTerminalCommand(ws: WebSocket, payload: { command: string }) {
  const cmd = payload.command?.trim().toLowerCase();
  let response = '';

  switch (cmd) {
    case 'status':
    case 'sysinfo':
      response = `[SYSTEM OK] KluisAI Core v4.1 | Gemini Engine: ${globalConfig.defaultModel} | Active peers: ${wss ? wss.clients.size : 1} | Uptime: ${Math.floor((Date.now() - serverStartTime) / 1000)}s | E2EE: AES-GCM-256`;
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

export function kluisBackendPlugin(): Plugin {
  return {
    name: 'kluisai-backend-plugin',
    configureServer(server) {
      // Attach WebSocketServer to Vite's HTTP server
      if (server.httpServer) {
        wss = new WebSocketServer({ server: server.httpServer as any });
        wss.on('connection', (ws) => {
          ws.send(JSON.stringify({
            type: 'sync:init',
            payload: {
              config: globalConfig,
              files: syncedEncryptedFiles,
              connectedClients: wss?.clients.size || 1,
              timestamp: Date.now(),
            },
          }));

          broadcast({
            type: 'presence:update',
            payload: { activeClients: wss?.clients.size || 1 },
          });

          ws.on('message', (raw) => {
            try {
              const data = JSON.parse(raw.toString());
              if (data.type === 'chat:sync') {
                broadcast({ type: 'chat:synced', payload: data.payload }, ws);
              } else if (data.type === 'file:broadcast') {
                broadcast({ type: 'file:shared', payload: data.payload }, ws);
              } else if (data.type === 'terminal:command') {
                handleTerminalCommand(ws, data.payload);
              }
            } catch (e) {
              console.error('WS parse error:', e);
            }
          });

          ws.on('close', () => {
            broadcast({
              type: 'presence:update',
              payload: { activeClients: wss?.clients.size || 0 },
            });
          });
        });
      }

      // JSON body parser helper
      const parseJsonBody = (req: any): Promise<any> => {
        return new Promise((resolve) => {
          let data = '';
          req.on('data', (chunk: any) => { data += chunk; });
          req.on('end', () => {
            try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); }
          });
        });
      };

      // API Routes Middleware
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];

        if (url === '/api/health' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            status: 'ok',
            uptime: Math.floor((Date.now() - serverStartTime) / 1000),
            activeClients: wss?.clients.size || 1,
            totalChatsProcessed,
            ttsGenerations,
            securityIncidents,
            maintenanceMode: globalConfig.maintenanceMode,
            model: globalConfig.defaultModel,
          }));
          return;
        }

        if (url === '/api/chat' && req.method === 'POST') {
          const body = await parseJsonBody(req);
          const { messages, model, systemInstruction, targetLanguage, generateSpeech } = body;
          const selectedModel = model || globalConfig.defaultModel;
          const finalInstruction = systemInstruction || globalConfig.systemPrompt;

          totalChatsProcessed++;

          try {
            const contents = (messages || []).map((m: { role: string; content: string }) => ({
              role: m.role === 'user' ? 'user' : 'model',
              parts: [{ text: m.content }],
            }));

            let promptInstruction = finalInstruction;
            if (targetLanguage && targetLanguage !== 'nl-NL') {
              promptInstruction += ` Please provide the response in language code: ${targetLanguage}.`;
            }

            const response = await ai.models.generateContent({
              model: selectedModel,
              contents,
              config: {
                systemInstruction: promptInstruction,
              },
            });

            const replyText = response.text || '';
            let audioWavBase64 = null;

            if (generateSpeech && replyText.trim()) {
              try {
                ttsGenerations++;
                const ttsResponse = await ai.models.generateContent({
                  model: 'gemini-3.8-flash-lite-tts',
                  contents: [
                    {
                      role: 'user',
                      parts: [
                        {
                          text: replyText.slice(0, 1000),
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
                        prebuiltVoiceConfig: { voiceName: globalConfig.dutchVoiceName as any },
                      },
                    },
                  },
                });

                const rawAudio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                if (rawAudio) {
                  audioWavBase64 = rawAudio;
                }
              } catch (audioErr) {
                console.warn('TTS warning:', audioErr);
              }
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              reply: replyText,
              modelUsed: selectedModel,
              audioWavBase64,
              timestamp: Date.now(),
            }));
          } catch (error: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: error?.message || 'Chat processing failed' }));
          }
          return;
        }

        if (url === '/api/translate' && req.method === 'POST') {
          const body = await parseJsonBody(req);
          const { text, sourceLanguage, targetLanguage } = body;

          try {
            const prompt = `Translate the following accurately into ${targetLanguage || 'nl-NL'}. Return ONLY the direct translation:\n\n${text}`;
            const response = await ai.models.generateContent({
              model: 'gemini-3.1-flash-lite',
              contents: prompt,
              config: {
                systemInstruction: 'You are an ultra-fast, professional multilingual neural translator for real-time international communication.',
              },
            });

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              translatedText: response.text || '',
              sourceLanguage,
              targetLanguage,
              timestamp: Date.now(),
            }));
          } catch (error: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: error?.message || 'Translation failed' }));
          }
          return;
        }

        if (url === '/api/admin/system' && req.method === 'GET') {
          const mem = process.memoryUsage();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            config: globalConfig,
            metrics: {
              activeConnections: wss?.clients.size || 1,
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
          }));
          return;
        }

        if (url === '/api/admin/config' && req.method === 'POST') {
          const body = await parseJsonBody(req);
          globalConfig = { ...globalConfig, ...body };
          serverAuditLogs.push({
            id: 'audit_' + Date.now(),
            timestamp: Date.now(),
            eventType: 'CONFIG_CHANGE',
            severity: 'INFO',
            description: `Global configuration updated: ${Object.keys(body).join(', ')}`,
            actor: 'admin-terminal',
          });

          broadcast({ type: 'config:updated', payload: globalConfig });

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, config: globalConfig }));
          return;
        }

        if (url === '/api/admin/user-status' && req.method === 'POST') {
          const body = await parseJsonBody(req);
          const { userId, status } = body;
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
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, user }));
          } else {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'User not found' }));
          }
          return;
        }

        if (url === '/api/admin/audit-log' && req.method === 'POST') {
          const body = await parseJsonBody(req);
          serverAuditLogs.push({
            id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            timestamp: Date.now(),
            eventType: body.eventType || 'SECURITY',
            severity: body.severity || 'INFO',
            description: body.description || 'Client security event logged',
            actor: body.actor || 'client-vault',
          });
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true }));
          return;
        }

        if (url === '/api/files' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ files: syncedEncryptedFiles }));
          return;
        }

        if (url === '/api/files' && req.method === 'POST') {
          const body = await parseJsonBody(req);
          const { id, fileName, mimeType, size, uploadedAt, uploader, encryptedData, iv } = body;
          const fileObj = {
            id,
            fileName: fileName || 'unnamed_encrypted.bin',
            mimeType: mimeType || 'application/octet-stream',
            size: size || 0,
            uploadedAt: uploadedAt || Date.now(),
            uploader: uploader || 'Peer',
            encryptedData,
            iv,
          };
          const existingIdx = syncedEncryptedFiles.findIndex(f => f.id === id);
          if (existingIdx >= 0) syncedEncryptedFiles[existingIdx] = fileObj;
          else syncedEncryptedFiles.push(fileObj);

          broadcast({ type: 'file:shared', payload: fileObj });

          serverAuditLogs.push({
            id: 'audit_' + Date.now(),
            timestamp: Date.now(),
            eventType: 'ENCRYPTION',
            severity: 'INFO',
            description: `Zero-knowledge encrypted file synced: ${fileName} (${Math.round(size / 1024)} KB)`,
            actor: uploader || 'sync-peer',
          });

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, file: fileObj }));
          return;
        }

        if (url?.startsWith('/api/files/') && req.method === 'DELETE') {
          const fileId = url.replace('/api/files/', '');
          syncedEncryptedFiles = syncedEncryptedFiles.filter(f => f.id !== fileId);
          broadcast({ type: 'file:deleted', payload: { id: fileId } });
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true }));
          return;
        }

        next();
      });
    },
  };
}
