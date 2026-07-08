import type { CombatEventContext, CombatEventName, CombatPatch, CombatSubscriber } from './types';

export type CombatPipelineResult<TState> = {
  state: TState;
  patches: CombatPatch[];
};

export function dispatchCombatEvent<TState>(
  state: TState,
  eventName: CombatEventName,
  context: Omit<CombatEventContext, 'eventName'>,
  subscribers: CombatSubscriber[],
): CombatPipelineResult<TState> {
  const eventContext = { ...context, eventName };
  const patches = getOrderedSubscribers(subscribers)
    .flatMap((subscriber) => subscriber.hooks[eventName]?.(eventContext) ?? []);

  return applyCombatPatches(state, patches);
}

export function applyCombatPatches<TState>(state: TState, patches: CombatPatch[]): CombatPipelineResult<TState> {
  return { state, patches };
}

export function getOrderedSubscribers(subscribers: CombatSubscriber[]) {
  return [...subscribers].sort((a, b) => {
    const priorityDelta = (a.priority ?? 0) - (b.priority ?? 0);
    if (priorityDelta !== 0) return priorityDelta;
    const idDelta = a.id.localeCompare(b.id);
    if (idDelta !== 0) return idDelta;
    return a.ownerId.localeCompare(b.ownerId);
  });
}
