const legacyMinionIds: Record<string, string> = {
  'weak-melee-01': 'minion-01',
  'weak-range-01': 'minion-02',
  'weak-range-02': 'minion-03',
  'weak-melee-02': 'minion-04',
  'medium-range-01': 'minion-05',
  'strong-melee-01': 'minion-06',
  'strong-range-01': 'minion-07',
  'strong-range-02': 'minion-08',
  'medium-melee-01': 'minion-09',
  'medium-melee-02': 'minion-10',
  'strong-range-03': 'minion-11',
  'strong-range-04': 'minion-12',
  'strong-range-05': 'minion-13',
  'weak-worker-01': 'minion-14',
  'medium-worker-01': 'minion-15',
  'strong-worker-01': 'minion-16',
};

const legacyTechnologyIds: Record<string, string> = {
  'bigger-treasury': 'technology-01',
  bard: 'technology-02',
  'better-armor': 'technology-03',
  'war-flag': 'technology-04',
  'golden-button': 'technology-05',
};

const legacyCastleIds: Record<string, string> = {
  'easy-01': 'castle-01',
  'easy-02': 'castle-02',
  'medium-01': 'castle-03',
  'medium-02': 'castle-04',
  'medium-03': 'castle-05',
  'hard-01': 'castle-06',
  'hard-02': 'castle-07',
  'hard-03': 'castle-08',
  'hard-04': 'castle-09',
  'hard-05': 'castle-10',
};

export const resolveLegacyMinionId = (id: string) => legacyMinionIds[id] ?? id;
export const resolveLegacyTechnologyId = (id: string) => legacyTechnologyIds[id] ?? id;
export const resolveLegacyCastleId = (id: string) => legacyCastleIds[id] ?? id;
