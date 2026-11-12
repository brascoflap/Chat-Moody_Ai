export type GeminiModelId = 
  | 'gemini-4-hydrogen' 
  | 'gemini-4-carbon' 
  | 'gemini-4-argon' 
  | 'gemini-3.1-flash-lite'
  | 'gemini-3.8-flash-lite-tts';

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'xai' | 'opensource';

export interface AIModelDescriptor {
  id: string;
  name: string;
  provider: AIProvider;
  tier: 'free' | 'paid' | 'local_opensource';
  contextWindow: string;
  category: 'primary' | 'reasoner' | 'coder' | 'executor' | 'agent';
  description: string;
}

export interface AgentZeroSubAgent {
  id: string;
  role: 'leader' | 'researcher' | 'coder' | 'critic' | 'executor';
  name: string;
  assignedModel: string;
  provider: AIProvider;
  systemPrompt: string;
  active: boolean;
}

export interface AgentZeroConfig {
  enabled: boolean;
  coordinatorModel: string;
  orchestrationMode: 'hierarchical' | 'collaborative' | 'debate';
  maxIterations: number;
  subAgents: AgentZeroSubAgent[];
}

export interface MessageTranslation {
  targetLanguage: string;
  translatedText: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  originalLanguage?: string;
  translation?: MessageTranslation;
  timestamp: number;
  audioWavBase64?: string; // If Dutch/multilingual TTS generated
  isEncrypted?: boolean;
}

export interface SystemConfig {
  defaultModel: GeminiModelId;
  systemPrompt: string;
  dutchVoiceName: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
  dutchSpeechStyle: string;
  offlineEncryptionEnabled: boolean;
  crossPlatformSyncEnabled: boolean;
  sessionTimeoutMinutes: number;
  auditRetentionDays: number;
  maintenanceMode: boolean;
  requireAdminMfa: boolean;
  syncNodeAddress: string;
}

export interface SystemMetrics {
  activeConnections: number;
  totalChatsProcessed: number;
  encryptedBytesStored: number;
  ttsGenerations: number;
  securityIncidents: number;
  systemUptimeSeconds: number;
  geminiApiHealth: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  memoryUsageMb: number;
}

export interface UserAccount {
  id: string;
  email: string;
  role: 'admin' | 'auditor' | 'user';
  createdAt: number;
  lastLogin: number;
  status: 'active' | 'suspended';
  encryptionKeyFingerprint: string;
}

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'nl-NL', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'en-US', name: 'English (US)', nativeName: 'English', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English (UK)', flag: '🇬🇧' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'it-IT', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt-BR', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'zh-CN', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'uk-UA', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
];
