import { Groq } from 'groq-sdk';
import { GROQ_CONFIG } from './config';

export interface GroqModel {
  id: string;
  name: string;
  description?: string;
  created?: number;
  owned_by?: string;
  root?: string;
}

const groqClient = new Groq({
  apiKey: GROQ_CONFIG.API_KEY,
  dangerouslyAllowBrowser: true
});

export const modelService = {
  async getModels(): Promise<GroqModel[]> {
    try {
      const cachedModels = this.getModelsFromCache();
      if (cachedModels) return cachedModels;

      const response = await fetch('https://api.groq.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${GROQ_CONFIG.API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();
      const models = data.data
        .filter((model: any) => !model.id.includes('test') && !model.id.includes('deprecated'))
        .map((model: any) => ({
          id: model.id,
          name: this.getModelDisplayName(model.id),
          description: model.description,
          created: model.created,
          owned_by: model.owned_by,
          root: model.root
        }));

      this.cacheModels(models);
      return models;
    } catch (error) {
      console.error('Error fetching models:', error);
      return this.getFallbackModels();
    }
  },

  async getCurrentModel(): Promise<string> {
    return localStorage.getItem('groq_model') || GROQ_CONFIG.DEFAULT_MODEL;
  },

  async setCurrentModel(modelId: string): Promise<void> {
    localStorage.setItem('groq_model', modelId);
  },

  getModelDisplayName(modelId: string): string {
    const displayNames: { [key: string]: string } = {
      'mixtral-8x7b-32768': 'Mixtral 8x7B (32K context)',
      'llama2-70b-4096': 'LLaMA2 70B (4K context)',
      'gemma-7b-it': 'Gemma 7B-IT',
      'llama3-70b-8192': 'LLaMA3 70B (8K context)',
      'llama3-8b-8192': 'LLaMA3 8B (8K context)'
    };
    return displayNames[modelId] || modelId;
  },

  getModelsFromCache(): GroqModel[] | null {
    try {
      const cached = localStorage.getItem(GROQ_CONFIG.MODELS_CACHE_KEY);
      if (!cached) return null;

      const { models, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > GROQ_CONFIG.CACHE_DURATION) {
        localStorage.removeItem(GROQ_CONFIG.MODELS_CACHE_KEY);
        return null;
      }

      return models;
    } catch {
      return null;
    }
  },

  cacheModels(models: GroqModel[]): void {
    localStorage.setItem(GROQ_CONFIG.MODELS_CACHE_KEY, JSON.stringify({
      models,
      timestamp: Date.now()
    }));
  },

  getFallbackModels(): GroqModel[] {
    return [
      {
        id: 'mixtral-8x7b-32768',
        name: 'Mixtral 8x7B (32K context)'
      },
      {
        id: 'llama2-70b-4096',
        name: 'LLaMA2 70B (4K context)'
      }
    ];
  }
};