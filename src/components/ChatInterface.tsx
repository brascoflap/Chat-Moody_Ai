import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Send, 
  Languages, 
  Shield, 
  Sparkles, 
  Bot, 
  User, 
  Play, 
  Pause,
  ArrowRight,
  Globe,
  Radio,
  Copy,
  Check
} from 'lucide-react';
import type { ChatMessage, GeminiModelId } from '../types';
import { SUPPORTED_LANGUAGES } from '../types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, options: { model: GeminiModelId; targetLanguage: string; generateSpeech: boolean }) => Promise<void>;
  isLoading: boolean;
  isHighContrast?: boolean;
  selectedModel: GeminiModelId;
  onModelChange: (model: GeminiModelId) => void;
  targetLanguage: string;
  onLanguageChange: (lang: string) => void;
  isDutchVoiceEnabled: boolean;
  onToggleDutchVoice: (enabled: boolean) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isLoading,
  isHighContrast = false,
  selectedModel,
  onModelChange,
  targetLanguage,
  onLanguageChange,
  isDutchVoiceEnabled,
  onToggleDutchVoice,
}) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [activeAudioPlaying, setActiveAudioPlaying] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom of conversation thread
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Web Speech Recognition for Dutch Voice input
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = targetLanguage === 'nl-NL' ? 'nl-NL' : 'nl-NL'; // Default Dutch voice capture

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition status:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          setTranscribeError(`Spraakherkenning: ${event.error}`);
          setTimeout(() => setTranscribeError(null), 4000);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [targetLanguage]);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      setTranscribeError('Web Speech API is niet beschikbaar in deze browser. Typ uw bericht in het invoerveld.');
      setTimeout(() => setTranscribeError(null), 4000);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang = targetLanguage;
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Recognition start error:', err);
      }
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isLoading) return;

    setInputText('');
    await onSendMessage(text, {
      model: selectedModel,
      targetLanguage,
      generateSpeech: isDutchVoiceEnabled,
    });
  };

  const playAudioClip = (audioWavBase64: string, msgId: string) => {
    if (activeAudioPlaying === msgId) {
      audioPlayerRef.current?.pause();
      setActiveAudioPlaying(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    // Play WAV or Web Speech fallback
    const audio = new Audio(`data:audio/wav;base64,${audioWavBase64}`);
    audioPlayerRef.current = audio;
    setActiveAudioPlaying(msgId);

    audio.onended = () => {
      setActiveAudioPlaying(null);
    };
    audio.onerror = () => {
      setActiveAudioPlaying(null);
    };

    audio.play().catch(e => {
      console.warn('Audio playback was prevented by browser policy:', e);
      setActiveAudioPlaying(null);
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTranslateMessage = async (msg: ChatMessage, langCode: string) => {
    setTranslatingId(msg.id);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: msg.content,
          targetLanguage: langCode,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        msg.translation = {
          targetLanguage: langCode,
          translatedText: data.translatedText,
          timestamp: Date.now(),
        };
        // force state refresh
        setInputText(prev => prev);
      }
    } catch (e) {
      console.error('Translation error:', e);
    } finally {
      setTranslatingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Top Interactive Configuration Strip */}
      <div className="px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center gap-3">
          {/* Model Selector across Universal Catalog */}
          <div className="flex items-center gap-1.5">
            <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value as any)}
              className="bg-slate-100 dark:bg-slate-850 text-slate-900 dark:text-slate-100 font-medium rounded px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-emerald-500"
              aria-label="Select AI Model"
            >
              <optgroup label="Google Gemini">
                <option value="gemini-4-hydrogen">gemini-4-hydrogen (Snel & Algemeen)</option>
                <option value="gemini-4-carbon">gemini-4-carbon (Deep Reasoning & Audit)</option>
                <option value="gemini-4-argon">gemini-4-argon (Complexe Code & Taken)</option>
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Ultra-snelle respons)</option>
              </optgroup>
              <optgroup label="Open-Source & Lokaal (Ollama / vLLM)">
                <option value="deepseek-r1-distill">DeepSeek R1 (Open Source / Ollama)</option>
                <option value="llama-3.3-70b-instruct">Llama 3.3 70B (Open Weights)</option>
                <option value="mistral-large-2411">Mistral Large 2 (Europese Cloud)</option>
                <option value="qwen-2.5-coder-32b">Qwen 2.5 Coder 32B (Open Coder)</option>
              </optgroup>
              <optgroup label="OpenAI & Codex">
                <option value="gpt-4o">ChatGPT-4o Omni (Commercieel)</option>
                <option value="o1-preview">OpenAI o1 / Codex Reasoning</option>
              </optgroup>
              <optgroup label="Anthropic Claude">
                <option value="claude-3-7-sonnet">Claude 3.7 Sonnet (Hybrid Thinking)</option>
              </optgroup>
              <optgroup label="xAI Grok">
                <option value="grok-2">xAI Grok 2 (Realtime Data)</option>
              </optgroup>
            </select>
          </div>

          {/* Multilingual Target Selector */}
          <div className="flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <select
              value={targetLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium rounded px-2.5 py-1 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-cyan-500"
              aria-label="Select language translation"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Voice and Privacy Badges */}
        <div className="flex items-center gap-2">
          {/* Dutch Voice Toggle with Square LED */}
          <button
            onClick={() => onToggleDutchVoice(!isDutchVoiceEnabled)}
            className={`btn-neon flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border transition ${
              isDutchVoiceEnabled
                ? 'btn-neon-active border-emerald-500'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
            }`}
            title="Wissel Nederlandse Stem (Gemini 3.8 Flash Lite TTS)"
          >
            <span className={`led-sq ${isDutchVoiceEnabled ? 'led-sq-active' : 'led-sq-inactive'}`} />
            {isDutchVoiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="whitespace-nowrap">Stem (NL)</span>
          </button>

          {/* E2EE Indicator with Square LED */}
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-slate-850 border border-emerald-300 dark:border-slate-700 px-2 py-1 rounded-md">
            <span className="led-sq led-sq-active" />
            <span>E2EE AES-256</span>
          </span>
        </div>
      </div>

      {transcribeError && (
        <div className="px-4 py-1.5 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 text-xs border-b border-amber-200 dark:border-amber-800">
          {transcribeError}
        </div>
      )}

      {/* Scrollable Conversation Thread */}
      <div 
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4"
        tabIndex={0}
        role="region"
        aria-label="Conversation history"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto p-6 space-y-4 text-slate-500 dark:text-slate-400">
            <div className="p-4 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
              <Bot className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                KluisAI Veilige Meertalige Assistent
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Spreek in het Nederlands met de microfoon of typ een vraag. Alle interacties zijn end-to-end versleuteld op uw apparaat.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 text-xs pt-2">
              <button
                onClick={() => setInputText('Hoe werkt end-to-end encryptie en offline gegevensopslag in KluisAI?')}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition text-left"
              >
                "Hoe werkt encryptie in KluisAI?"
              </button>
              <button
                onClick={() => setInputText('Vertel me in het Nederlands een samenvatting van de privacy voordelen van data-soevereiniteit.')}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition text-left"
              >
                "Wat zijn de voordelen van data-soevereiniteit?"
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                    isUser
                      ? 'bg-slate-900 text-white dark:bg-emerald-700'
                      : 'bg-emerald-600 text-white dark:bg-emerald-600'
                  }`}
                  aria-hidden="true"
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Body */}
                <div className={`space-y-1.5 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      isUser
                        ? 'bg-slate-900 text-white dark:bg-slate-800 rounded-tr-none'
                        : isHighContrast
                        ? 'bg-white text-black border-2 border-black dark:bg-slate-900 dark:text-white dark:border-white rounded-tl-none'
                        : 'bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                    {/* Secondary Real-time Translation Card if present */}
                    {msg.translation && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/50 p-2 rounded">
                        <div className="flex items-center justify-between text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold mb-1">
                          <span className="flex items-center gap-1">
                            <Languages className="w-3 h-3" /> Vertaald naar {msg.translation.targetLanguage}
                          </span>
                          <span className="text-[10px] text-slate-400">Gemini Neural</span>
                        </div>
                        <p className="italic">{msg.translation.translatedText}</p>
                      </div>
                    )}
                  </div>

                  {/* Message Action Bar: Audio voice playback, Translate, Copy, E2EE mark */}
                  <div className={`flex items-center gap-2 text-xs text-slate-400 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <span className="font-mono text-[11px] tabular-nums">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {/* Dutch Audio Player for Assistant Messages */}
                    {!isUser && msg.audioWavBase64 && (
                      <button
                        onClick={() => playAudioClip(msg.audioWavBase64!, msg.id)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition ${
                          activeAudioPlaying === msg.id
                            ? 'bg-emerald-600 text-white animate-pulse'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                        }`}
                        title="Beluister Nederlandse stem (Gemini TTS)"
                      >
                        {activeAudioPlaying === msg.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        <span>{activeAudioPlaying === msg.id ? 'Afspelen...' : 'Luister (NL)'}</span>
                      </button>
                    )}

                    {/* Multilingual Quick Translation Action */}
                    {!isUser && (
                      <button
                        onClick={() => handleTranslateMessage(msg, targetLanguage)}
                        disabled={translatingId === msg.id}
                        className="hover:text-cyan-600 dark:hover:text-cyan-400 flex items-center gap-1 text-[11px]"
                        title="Vertaal dit bericht in de geselecteerde taal"
                      >
                        <Languages className="w-3 h-3" />
                        <span>{translatingId === msg.id ? 'Vertalen...' : 'Vertaal'}</span>
                      </button>
                    )}

                    {/* Copy Button */}
                    <button
                      onClick={() => copyToClipboard(msg.content, msg.id)}
                      className="hover:text-slate-600 dark:hover:text-slate-200"
                      title="Kopieer tekst"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 max-w-xl mr-auto items-center text-slate-500 dark:text-slate-400 text-xs">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>KluisAI genereert versleuteld antwoord via {selectedModel}...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice Interface & Chat Input Controls */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-end gap-2">
          {/* Dutch Microphone Voice Button */}
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            className={`p-3 rounded-xl transition flex items-center justify-center shrink-0 ${
              isListening
                ? 'bg-rose-600 text-white animate-bounce shadow-lg ring-4 ring-rose-200 dark:ring-rose-950'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800'
            }`}
            title={isListening ? 'Opname stoppen' : 'Start Nederlandse spraakinvoer (Web Speech)'}
            aria-label="Toggle voice input"
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text Input Area */}
          <div className="flex-1 relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isListening ? 'Luisteren naar uw stem (Nederlands)...' : 'Typ uw bericht of stel een vraag... (Shift+Enter voor nieuwe regel)'}
              rows={1}
              className={`w-full resize-none rounded-xl py-3 pl-4 pr-10 text-sm leading-relaxed border transition focus:outline-none ${
                isHighContrast
                  ? 'bg-white dark:bg-slate-950 text-black dark:text-white border-2 border-black dark:border-white'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:border-emerald-500'
              }`}
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className={`p-3 rounded-xl transition flex items-center justify-center shrink-0 ${
              inputText.trim() && !isLoading
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
