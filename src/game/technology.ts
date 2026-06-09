import builtInTech from '../data/tech.json';

export type ContentSource = 'built-in' | 'dlc';

export type TechnologyJson = {
  id: string;
  name: string;
  icon: string;
  description: string;
  cost: number;
  effect: {
    clickPower?: number;
    attackMultiplier?: number;
    healthMultiplier?: number;
  };
};

export type TechnologyDefinition = TechnologyJson & {
  source: ContentSource;
};

const CUSTOM_TECH_KEY = 'minion-clicker-custom-tech-v1';

export function validateTechnologyJson(input: unknown): TechnologyJson {
  const tech = input as Partial<TechnologyJson>;
  if (!tech || typeof tech !== 'object') throw new Error('Technology must be an object.');
  if (!tech.id || !/^[a-z0-9-]+$/i.test(tech.id)) throw new Error('Technology id must be a slug.');
  if (!tech.name) throw new Error('Technology name is required.');
  if (!tech.icon) throw new Error('Technology icon is required.');
  if (!tech.description) throw new Error('Technology description is required.');
  if (typeof tech.cost !== 'number' || tech.cost < 0) throw new Error('Technology cost must be a positive number.');
  if (!tech.effect || typeof tech.effect !== 'object') throw new Error('Technology effect is required.');
  const effect = tech.effect;
  for (const key of ['clickPower', 'attackMultiplier', 'healthMultiplier'] as const) {
    if (effect[key] !== undefined && (typeof effect[key] !== 'number' || effect[key] < 0)) {
      throw new Error(`Technology effect.${key} must be a positive number.`);
    }
  }
  if (effect.clickPower === undefined && effect.attackMultiplier === undefined && effect.healthMultiplier === undefined) {
    throw new Error('Technology effect must include clickPower, attackMultiplier, or healthMultiplier.');
  }
  return {
    id: tech.id,
    name: tech.name,
    icon: tech.icon,
    description: tech.description,
    cost: tech.cost,
    effect: {
      clickPower: effect.clickPower,
      attackMultiplier: effect.attackMultiplier,
      healthMultiplier: effect.healthMultiplier,
    },
  };
}

export function loadCustomTech(): TechnologyJson[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = window.localStorage.getItem(CUSTOM_TECH_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    return list.map(validateTechnologyJson);
  } catch {
    return [];
  }
}

export function saveCustomTech(tech: TechnologyJson[]) {
  window.localStorage.setItem(CUSTOM_TECH_KEY, JSON.stringify(tech.map(validateTechnologyJson)));
}

export function clearCustomTech() {
  window.localStorage.removeItem(CUSTOM_TECH_KEY);
}

function withSource(tech: TechnologyJson, source: ContentSource): TechnologyDefinition {
  return { ...tech, source };
}

export const technologySchemaExample: TechnologyJson = {
  id: 'custom-coin-song',
  name: 'Coin Song',
  icon: '🎼',
  description: 'Money button gains +3 per click.',
  cost: 1200,
  effect: { clickPower: 3 },
};

export const technologies: TechnologyDefinition[] = [
  ...(builtInTech as TechnologyJson[]).map(validateTechnologyJson).map((tech) => withSource(tech, 'built-in')),
  ...loadCustomTech().map((tech) => withSource(tech, 'dlc')),
].sort((a, b) => a.cost - b.cost);
