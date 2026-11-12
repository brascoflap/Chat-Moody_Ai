import type { AIModelDescriptor, AgentZeroConfig } from '../types';

export const UNIVERSAL_MODELS: AIModelDescriptor[] = [
  // Google Gemini Native Models
  {
    id: 'gemini-4-hydrogen',
    name: 'Gemini 4 Hydrogen',
    provider: 'gemini',
    tier: 'free',
    contextWindow: '1M tokens',
    category: 'primary',
    description: 'Bliksemsnelle all-round intelligentie voor algemene taken en redeneren.',
  },
  {
    id: 'gemini-4-carbon',
    name: 'Gemini 4 Carbon',
    provider: 'gemini',
    tier: 'paid',
    contextWindow: '2M tokens',
    category: 'reasoner',
    description: 'Diepste redeneervermogen voor root-cause analyse, wiskunde en encryptie.',
  },
  {
    id: 'gemini-4-argon',
    name: 'Gemini 4 Argon',
    provider: 'gemini',
    tier: 'paid',
    contextWindow: '2M tokens',
    category: 'coder',
    description: 'Gespecialiseerd in complexe interactieve code en systeembouw.',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    provider: 'gemini',
    tier: 'free',
    contextWindow: '500K tokens',
    category: 'executor',
    description: 'Ultra-lage latentie voor directe realtime spraak en vertalingen.',
  },

  // Open-Source Ecosystem (Ollama, vLLM, HuggingFace, Llama 3, DeepSeek, Mistral)
  {
    id: 'deepseek-r1-distill',
    name: 'DeepSeek R1 (Open Source / Ollama)',
    provider: 'opensource',
    tier: 'local_opensource',
    contextWindow: '128K tokens',
    category: 'reasoner',
    description: 'Open-weights wiskundig en logisch redeneermodel via lokale Ollama of remote vLLM.',
  },
  {
    id: 'llama-3.3-70b-instruct',
    name: 'Meta Llama 3.3 70B (Open Weights)',
    provider: 'opensource',
    tier: 'local_opensource',
    contextWindow: '128K tokens',
    category: 'primary',
    description: 'Krachtigste open-source model voor autonome lokale uitvoering zonder cloud data-lek.',
  },
  {
    id: 'mistral-large-2411',
    name: 'Mistral Large 2 (Europese Open/EU Cloud)',
    provider: 'opensource',
    tier: 'local_opensource',
    contextWindow: '128K tokens',
    category: 'primary',
    description: 'Europese data-soevereiniteit en uitstekende meertaligheid (waaronder Nederlands).',
  },
  {
    id: 'qwen-2.5-coder-32b',
    name: 'Qwen 2.5 Coder 32B (Open Source)',
    provider: 'opensource',
    tier: 'local_opensource',
    contextWindow: '128K tokens',
    category: 'coder',
    description: 'Topklasse open-source codegeneratie en terminal script constructie.',
  },

  // OpenAI Family
  {
    id: 'gpt-4o',
    name: 'ChatGPT-4o (Omni)',
    provider: 'openai',
    tier: 'paid',
    contextWindow: '128K tokens',
    category: 'primary',
    description: 'Commercieel multimodinaal vlaggeschip van OpenAI.',
  },
  {
    id: 'o1-preview',
    name: 'OpenAI o1 / Codex Reasoning',
    provider: 'openai',
    tier: 'paid',
    contextWindow: '128K tokens',
    category: 'reasoner',
    description: 'Geavanceerd denkend model voor complexe programmeer- en logistieke taken.',
  },

  // Anthropic Claude
  {
    id: 'claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet (Hybrid Thinking)',
    provider: 'anthropic',
    tier: 'paid',
    contextWindow: '200K tokens',
    category: 'coder',
    description: 'Diepe hybride redenering en software architectuur.',
  },

  // xAI Grok
  {
    id: 'grok-2',
    name: 'xAI Grok 2',
    provider: 'xai',
    tier: 'paid',
    contextWindow: '128K tokens',
    category: 'primary',
    description: 'Realtime actuele feitenkennis en ongefilterd redeneren van xAI.',
  },
];

export const DEFAULT_AGENT_ZERO_CONFIG: AgentZeroConfig = {
  enabled: true,
  coordinatorModel: 'gemini-4-hydrogen',
  orchestrationMode: 'hierarchical',
  maxIterations: 3,
  subAgents: [
    {
      id: 'ag_zero_coord',
      role: 'leader',
      name: 'Agent Zero: Master Coordinator',
      assignedModel: 'gemini-4-hydrogen',
      provider: 'gemini',
      systemPrompt: 'Je bent de hoofdcoördinator (Agent Zero). Analyseer de gebruikersintentie, splits complexe vraagstukken op in deeltaken, delegeer aan specialisten en syntheseer een sluitend eindantwoord.',
      active: true,
    },
    {
      id: 'ag_researcher',
      role: 'researcher',
      name: 'Agent Scout (Deep Research & Facts)',
      assignedModel: 'gemini-4-carbon',
      provider: 'gemini',
      systemPrompt: 'Je bent gespecialiseerd in diepgaande research, feitelijke verificatie en contextuele documentanalyse.',
      active: true,
    },
    {
      id: 'ag_coder',
      role: 'coder',
      name: 'Agent Codex (Open-Source / Codex Coder)',
      assignedModel: 'qwen-2.5-coder-32b',
      provider: 'opensource',
      systemPrompt: 'Je bent de software engineering specialist. Schrijf robuuste, veilige en geteste code.',
      active: true,
    },
    {
      id: 'ag_critic',
      role: 'critic',
      name: 'Agent Security & Privacy Validator',
      assignedModel: 'gemini-4-carbon',
      provider: 'gemini',
      systemPrompt: 'Je bent de onafhankelijke security criticus. Controleer antwoorden op data-soevereiniteit, encryptie-integriteit en logische consistentie.',
      active: true,
    },
  ],
};
