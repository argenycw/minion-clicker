import { getCombatBehaviorDefinition, isCombatBehaviorId, type CombatBehaviorId } from './behaviorRegistry';
import type { TraitBehaviorReference } from '../content';
import type { WeaponKind } from '../weapons/types';
import { getStatusEffectDefinition } from '../status-effects/definitions';
import type { StatusEffectId } from '../status-effects/types';

export type CombatImportDiagnostic = {
  path: string;
  code:
    | 'invalid-behavior-id'
    | 'invalid-affinity'
    | 'invalid-param'
    | 'unknown-status'
    | 'custom-script-deferred';
  message: string;
};

export type ImportedBehaviorReference = {
  id?: unknown;
  params?: unknown;
  script?: unknown;
};

export function validateImportedBehaviorReferences(
  behaviors: unknown,
  weaponKind: WeaponKind | undefined,
  path = 'behaviors',
): { behaviors: TraitBehaviorReference[]; diagnostics: CombatImportDiagnostic[] } {
  if (!Array.isArray(behaviors)) {
    return {
      behaviors: [],
      diagnostics: [{ path, code: 'invalid-param', message: 'Behaviors must be an array.' }],
    };
  }

  const accepted: TraitBehaviorReference[] = [];
  const diagnostics: CombatImportDiagnostic[] = [];
  behaviors.forEach((entry, index) => {
    const result = validateImportedBehaviorReference(entry, weaponKind, `${path}[${index}]`);
    if (result.behavior) accepted.push(result.behavior);
    diagnostics.push(...result.diagnostics);
  });
  return { behaviors: accepted, diagnostics };
}

export function validateImportedBehaviorReference(
  entry: unknown,
  weaponKind: WeaponKind | undefined,
  path = 'behavior',
): { behavior?: TraitBehaviorReference; diagnostics: CombatImportDiagnostic[] } {
  const diagnostics: CombatImportDiagnostic[] = [];
  if (!entry || typeof entry !== 'object') {
    return { diagnostics: [{ path, code: 'invalid-param', message: 'Behavior reference must be an object.' }] };
  }

  const reference = entry as ImportedBehaviorReference;
  if (reference.script !== undefined) {
    diagnostics.push({
      path: `${path}.script`,
      code: 'custom-script-deferred',
      message: 'Custom script behavior is planned but disabled for the current import format.',
    });
  }

  if (!isCombatBehaviorId(reference.id)) {
    return {
      diagnostics: [
        ...diagnostics,
        { path: `${path}.id`, code: 'invalid-behavior-id', message: 'Behavior id must be a registered stable behavior id.' },
      ],
    };
  }

  const definition = getCombatBehaviorDefinition(reference.id);
  if (weaponKind && definition.affinity !== 'any' && definition.affinity !== weaponKind) {
    diagnostics.push({
      path: `${path}.id`,
      code: 'invalid-affinity',
      message: `${definition.name} can only be used on ${definition.affinity} weapons.`,
    });
  }

  const paramsResult = validateImportedBehaviorParams(reference.id, reference.params, `${path}.params`);
  diagnostics.push(...paramsResult.diagnostics);
  if (diagnostics.some((diagnostic) => diagnostic.code !== 'custom-script-deferred')) return { diagnostics };

  return {
    behavior: {
      id: reference.id,
      params: paramsResult.params,
    },
    diagnostics,
  };
}

function validateImportedBehaviorParams(
  behaviorId: CombatBehaviorId,
  params: unknown,
  path: string,
): { params?: TraitBehaviorReference['params']; diagnostics: CombatImportDiagnostic[] } {
  if (params === undefined) return { diagnostics: [] };
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return { diagnostics: [{ path, code: 'invalid-param', message: 'Behavior params must be an object.' }] };
  }

  const definition = getCombatBehaviorDefinition(behaviorId);
  const accepted: TraitBehaviorReference['params'] = {};
  const diagnostics: CombatImportDiagnostic[] = [];
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value === undefined) continue;
    if (!definition.params.includes(key)) {
      diagnostics.push({ path: `${path}.${key}`, code: 'invalid-param', message: `${definition.name} does not support param ${key}.` });
      continue;
    }
    if (key === 'statusId') {
      if (typeof value !== 'string') {
        diagnostics.push({ path: `${path}.${key}`, code: 'invalid-param', message: 'statusId must be a string.' });
        continue;
      }
      try {
        getStatusEffectDefinition(value as StatusEffectId);
        accepted[key] = value;
      } catch {
        diagnostics.push({ path: `${path}.${key}`, code: 'unknown-status', message: `Unknown status effect: ${value}` });
      }
      continue;
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      diagnostics.push({ path: `${path}.${key}`, code: 'invalid-param', message: `${definition.name} ${key} must be a finite number.` });
      continue;
    }
    accepted[key] = value;
  }
  return { params: accepted, diagnostics };
}
