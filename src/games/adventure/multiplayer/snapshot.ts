import type { AdventureState, KnockbackMotion } from '../state';
import type { WorldObject } from '../world';
import type { StatusEffectInstance } from '../status-effects/types';

export function rebaseAdventureSnapshotClock(snapshot: AdventureState, receivedAt: number): AdventureState {
  const clockOffset = receivedAt - snapshot.lastTick;
  const rebaseObject = (object: WorldObject): WorldObject => object.hitAt === undefined
    ? object
    : { ...object, hitAt: object.hitAt + clockOffset };
  const rebaseChunks = (chunks: AdventureState['loadedChunks']) => chunks.map((chunk) => ({
    ...chunk,
    objects: chunk.objects.map(rebaseObject),
    enemies: chunk.enemies.map((enemy) => ({
      ...enemy,
      knockbackMotion: rebaseKnockbackMotion(enemy.knockbackMotion, clockOffset),
      statusEffects: rebaseStatusEffects(enemy.statusEffects, clockOffset),
    })),
  }));
  const players = Object.fromEntries(Object.entries(snapshot.players).map(([id, player]) => [id, {
    ...player,
    actor: {
      ...player.actor,
      knockbackMotion: rebaseKnockbackMotion(player.actor.knockbackMotion, clockOffset),
      statusEffects: rebaseStatusEffects(player.actor.statusEffects, clockOffset),
    },
    death: player.death ? rebaseDeath(player.death, clockOffset) : undefined,
  }])) as AdventureState['players'];

  return {
    ...snapshot,
    lastTick: receivedAt,
    player: {
      ...snapshot.player,
      knockbackMotion: rebaseKnockbackMotion(snapshot.player.knockbackMotion, clockOffset),
      statusEffects: rebaseStatusEffects(snapshot.player.statusEffects, clockOffset),
    },
    death: snapshot.death ? rebaseDeath(snapshot.death, clockOffset) : undefined,
    players,
    pendingAttacks: snapshot.pendingAttacks.map((attack) => attack.kind === 'melee-area'
      ? { ...attack, releasesAt: attack.releasesAt + clockOffset }
      : { ...attack, born: attack.born + clockOffset, endsAt: attack.endsAt + clockOffset }),
    enemies: snapshot.enemies.map((enemy) => ({
      ...enemy,
      knockbackMotion: rebaseKnockbackMotion(enemy.knockbackMotion, clockOffset),
      statusEffects: rebaseStatusEffects(enemy.statusEffects, clockOffset),
    })),
    worldObjects: snapshot.worldObjects.map(rebaseObject),
    loadedChunks: rebaseChunks(snapshot.loadedChunks),
    dungeon: snapshot.dungeon ? {
      ...snapshot.dungeon,
      enemies: snapshot.dungeon.enemies.map((enemy) => ({
        ...enemy,
        knockbackMotion: rebaseKnockbackMotion(enemy.knockbackMotion, clockOffset),
        statusEffects: rebaseStatusEffects(enemy.statusEffects, clockOffset),
      })),
      objects: snapshot.dungeon.objects.map(rebaseObject),
    } : undefined,
    overworldReturn: snapshot.overworldReturn ? {
      ...snapshot.overworldReturn,
      enemies: snapshot.overworldReturn.enemies.map((enemy) => ({
        ...enemy,
        knockbackMotion: rebaseKnockbackMotion(enemy.knockbackMotion, clockOffset),
        statusEffects: rebaseStatusEffects(enemy.statusEffects, clockOffset),
      })),
      worldObjects: snapshot.overworldReturn.worldObjects.map(rebaseObject),
      loadedChunks: rebaseChunks(snapshot.overworldReturn.loadedChunks),
    } : undefined,
  };
}

function rebaseKnockbackMotion(motion: KnockbackMotion | undefined, offset: number) {
  return motion ? {
    ...motion,
    startedAt: motion.startedAt + offset,
    endsAt: motion.endsAt + offset,
  } : undefined;
}

function rebaseDeath(death: NonNullable<AdventureState['death']>, offset: number) {
  return {
    diedAt: death.diedAt + offset,
    respawnReadyAt: death.respawnReadyAt + offset,
  };
}

function rebaseStatusEffects(effects: StatusEffectInstance[] | undefined, offset: number): StatusEffectInstance[] {
  return (effects ?? []).map((effect) => ({
    ...effect,
    appliedAt: effect.appliedAt + offset,
    nextTickAt: effect.nextTickAt + offset,
    expiresAt: effect.expiresAt === undefined ? undefined : effect.expiresAt + offset,
  }));
}
