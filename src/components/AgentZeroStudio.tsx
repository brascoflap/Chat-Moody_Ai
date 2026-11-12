import React, { useState } from 'react';
import { 
  Bot, 
  Workflow, 
  Layers, 
  Play, 
  Sliders, 
  Plus, 
  Trash2, 
  Check, 
  ArrowRight,
  ShieldCheck,
  Cpu,
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import type { AgentZeroConfig, AgentZeroSubAgent, AIProvider } from '../types';
import { UNIVERSAL_MODELS } from '../lib/modelsCatalog';

interface AgentZeroStudioProps {
  config: AgentZeroConfig;
  onUpdateConfig: (newConfig: AgentZeroConfig) => void;
  isHighContrast?: boolean;
}

export const AgentZeroStudio: React.FC<AgentZeroStudioProps> = ({
  config,
  onUpdateConfig,
  isHighContrast = false,
}) => {
  const [agents, setAgents] = useState<AgentZeroSubAgent[]>(config.subAgents);
  const [orchestrationMode, setOrchestrationMode] = useState(config.orchestrationMode);
  const [isEnabled, setIsEnabled] = useState(config.enabled);
  const [simulationPrompt, setSimulationPrompt] = useState('Analyseer hoe een zero-trust data-architectuur gebouwd kan worden met open-source modellen en E2EE.');
  const [simulationOutput, setSimulationOutput] = useState<Array<{ agent: string; role: string; text: string; model: string }>>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleToggleAgent = (id: string) => {
    const next = agents.map(a => a.id === id ? { ...a, active: !a.active } : a);
    setAgents(next);
    onUpdateConfig({ ...config, subAgents: next });
  };

  const handleModelChange = (id: string, newModelId: string) => {
    const matched = UNIVERSAL_MODELS.find(m => m.id === newModelId);
    const next = agents.map(a => a.id === id ? {
      ...a,
      assignedModel: newModelId,
      provider: matched ? matched.provider : a.provider,
    } : a);
    setAgents(next);
    onUpdateConfig({ ...config, subAgents: next });
  };

  const handleSaveAll = () => {
    onUpdateConfig({
      ...config,
      enabled: isEnabled,
      orchestrationMode,
      subAgents: agents,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const runMultiAgentWorkflow = async () => {
    setIsSimulating(true);
    setSimulationOutput([]);

    try {
      // Step 1: Agent Zero Coordinator plans breakdown
      const leader = agents.find(a => a.role === 'leader' && a.active) || agents[0];
      setSimulationOutput(prev => [
        ...prev,
        {
          agent: leader.name,
          role: 'Leader / Planner',
          model: leader.assignedModel,
          text: `[PLANNING] Taak ontvangen: "${simulationPrompt}". Delegeren van onderzoek naar Agent Scout en technische code naar Agent Codex.`,
        },
      ]);

      // Call Gemini backend for the actual multi-agent synthesized steps
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-4-hydrogen',
          messages: [
            {
              role: 'user',
              content: `Simuleer een Agent Zero multi-agent orchestratie voor de volgende vraag: "${simulationPrompt}".
Geef een bondige multi-agent interactie met:
1. Agent Scout (Research & Feiten)
2. Agent Codex (Technische implementatie)
3. Agent Security (Privacy & Validator audit)
4. Agent Zero (Eindsynthese).
Houd elk antwoord professioneel, bondig en to-the-point in het Nederlands.`,
            },
          ],
          systemInstruction: 'Je bent de Agent Zero runtime orchestrator.',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSimulationOutput(prev => [
          ...prev,
          {
            agent: 'Multi-Agent Collective',
            role: 'Synthese & Uitvoering',
            model: `${leader.assignedModel} + Sub-agents`,
            text: data.reply || 'Multi-agent synthese voltooid.',
          },
        ]);
      }
    } catch (e: any) {
      setSimulationOutput(prev => [
        ...prev,
        {
          agent: 'Agent Zero Kernel',
          role: 'Error Handler',
          model: 'System',
          text: 'Fout tijdens agent delegatie: ' + e.message,
        },
      ]);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className={`p-4 md:p-6 max-w-5xl mx-auto space-y-5 ${isHighContrast ? 'text-black dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Workflow className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Agent Zero Multi-Agent Orchestrator
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Combineer Gemini, Open-Source (Ollama/DeepSeek/Llama), ChatGPT, Codex, Claude en Grok in één autonoom werkend multi-agent team.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Master Agent Zero Toggle Button with LED */}
          <button
            onClick={() => {
              const next = !isEnabled;
              setIsEnabled(next);
              onUpdateConfig({ ...config, enabled: next });
            }}
            className={`btn-neon tight-pad rounded-lg border text-xs font-semibold flex items-center gap-2 transition ${
              isEnabled 
                ? 'btn-neon-active border-emerald-500 text-emerald-300' 
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            <span className={`led-sq ${isEnabled ? 'led-sq-active' : 'led-sq-inactive'}`} />
            <span>Agent Zero Multi-Agent: {isEnabled ? 'ACTIEF' : 'UIT'}</span>
          </button>
        </div>
      </div>

      {savedNotice && (
        <div className="p-2 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Agent Zero configuratie succesvol gesynchroniseerd!</span>
        </div>
      )}

      {/* Orchestration Mode Bar */}
      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Orchestratie Model:</span>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(['hierarchical', 'collaborative', 'debate'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setOrchestrationMode(mode)}
                className={`btn-neon px-2.5 py-1 rounded text-xs transition flex items-center gap-1.5 ${
                  orchestrationMode === mode
                    ? 'btn-neon-active text-emerald-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className={`led-sq ${orchestrationMode === mode ? 'led-sq-active' : 'led-sq-inactive'}`} />
                <span className="capitalize">{mode}</span>
              </button>
            ))}
          </div>
        </div>

        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
          {agents.filter(a => a.active).length} ACTIEVE AGENTS GEKOPPELD
        </span>
      </div>

      {/* Sub-Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
              agent.active
                ? 'bg-slate-900 border-slate-700/80'
                : 'bg-slate-950/60 border-slate-850 opacity-60'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`led-sq ${agent.active ? 'led-sq-active' : 'led-sq-inactive'}`} />
                  <span className="font-bold text-xs text-slate-100">{agent.name}</span>
                </div>
                <button
                  onClick={() => handleToggleAgent(agent.id)}
                  className={`btn-neon px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold border transition ${
                    agent.active
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {agent.active ? 'Gekoppeld' : 'Uitgeschakeld'}
                </button>
              </div>

              {/* Model assignment dropdown */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Toegewezen AI Engine:</label>
                <select
                  value={agent.assignedModel}
                  onChange={(e) => handleModelChange(agent.id, e.target.value)}
                  className="w-full bg-slate-950 border border-slate-750 text-slate-200 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-emerald-500"
                >
                  <optgroup label="Google Gemini">
                    {UNIVERSAL_MODELS.filter(m => m.provider === 'gemini').map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.tier})</option>
                    ))}
                  </optgroup>
                  <optgroup label="Open-Source / Ollama / DeepSeek">
                    {UNIVERSAL_MODELS.filter(m => m.provider === 'opensource').map(m => (
                      <option key={m.id} value={m.id}>{m.name} (Lokaal/EU)</option>
                    ))}
                  </optgroup>
                  <optgroup label="OpenAI & Codex">
                    {UNIVERSAL_MODELS.filter(m => m.provider === 'openai').map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Anthropic Claude">
                    {UNIVERSAL_MODELS.filter(m => m.provider === 'anthropic').map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="xAI Grok">
                    {UNIVERSAL_MODELS.filter(m => m.provider === 'xai').map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <p className="text-[11px] text-slate-400 line-clamp-2 italic">
                "{agent.systemPrompt}"
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Simulation Sandbox */}
      <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
        <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
          <Play className="w-3.5 h-3.5 text-emerald-400" />
          Test Agent Zero Multi-Agent Samenwerking
        </h4>

        <div className="flex gap-2">
          <input
            type="text"
            value={simulationPrompt}
            onChange={(e) => setSimulationPrompt(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-750 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            placeholder="Typ een complexe opdracht voor het multi-agent team..."
          />
          <button
            onClick={runMultiAgentWorkflow}
            disabled={isSimulating}
            className="btn-neon px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition"
          >
            {isSimulating ? (
              <>
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Orchestreren...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Start Multi-Agent</span>
              </>
            )}
          </button>
        </div>

        {/* Live Multi-Agent Output Log */}
        {simulationOutput.length > 0 && (
          <div className="space-y-2 mt-3 pt-3 border-t border-slate-800 text-xs font-mono">
            {simulationOutput.map((out, idx) => (
              <div key={idx} className="p-2.5 bg-slate-950 rounded border border-slate-850 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400 font-bold">{out.agent}</span>
                  <span className="text-slate-500">{out.model}</span>
                </div>
                <p className="text-slate-300 font-sans whitespace-pre-wrap">{out.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
