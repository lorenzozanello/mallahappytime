import 'server-only';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { gateway, type EmbeddingModel, type LanguageModel } from 'ai';
import { config } from '@/lib/config';
import { createGroundedMockModel } from './mock-model';

/**
 * Provider abstraction for Happy. The product never depends on a specific vendor:
 * HAPPY_MODEL="<provider>/<model>" selects the model.
 *
 * Resolution order:
 *  1. "mock/…"           → deterministic test model (only in demo/test environments)
 *  2. Vercel AI Gateway  → when AI_GATEWAY_API_KEY (or Vercel OIDC) is available
 *  3. Direct provider    → ANTHROPIC_API_KEY / OPENAI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY
 *  4. none               → Happy runs in "solo malla" mode (retrieval only, clearly labelled)
 */
export type ResolvedModel =
  | { status: 'ready'; id: string; route: 'gateway' | 'direct' | 'mock'; model: LanguageModel }
  | { status: 'unavailable'; id: string; reason: string };

export function resolveHappyModel(id = config.happyModel): ResolvedModel {
  const [provider, ...rest] = id.split('/');
  const modelName = rest.join('/');
  if (!provider || !modelName) return { status: 'unavailable', id, reason: `HAPPY_MODEL inválido: "${id}" (formato proveedor/modelo)` };

  if (provider === 'mock') {
    if (process.env.NODE_ENV === 'production' && !config.demoMode) {
      return { status: 'unavailable', id, reason: 'El modelo de prueba solo está permitido en modo demostración o pruebas.' };
    }
    return { status: 'ready', id, route: 'mock', model: createGroundedMockModel() };
  }

  if (config.aiGatewayConfigured) return { status: 'ready', id, route: 'gateway', model: gateway(id) };

  const direct = directProvider(provider);
  if (direct) return { status: 'ready', id, route: 'direct', model: direct.languageModel(modelName) };

  return { status: 'unavailable', id, reason: 'No hay credenciales de IA configuradas (AI_GATEWAY_API_KEY o la clave del proveedor).' };
}

export function resolveEmbeddingModel(id = config.embeddingModel): EmbeddingModel | null {
  const [provider, ...rest] = id.split('/');
  const modelName = rest.join('/');
  if (!provider || !modelName || provider === 'mock') return null;
  if (config.aiGatewayConfigured) return gateway.embeddingModel(id);
  const direct = directProvider(provider);
  if (direct && 'embeddingModel' in direct) return direct.embeddingModel(modelName);
  return null;
}

function directProvider(provider: string) {
  switch (provider) {
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY ? createAnthropic() : null;
    case 'openai':
      return process.env.OPENAI_API_KEY ? createOpenAI() : null;
    case 'google':
      return process.env.GOOGLE_GENERATIVE_AI_API_KEY ? createGoogleGenerativeAI() : null;
    default:
      return null;
  }
}
