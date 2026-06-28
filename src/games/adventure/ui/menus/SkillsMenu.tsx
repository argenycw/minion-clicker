import type { ComponentProps } from 'react';
import { CharacterSkillsMenuShell } from './CharacterSkillsMenuShell';

export function SkillsMenu(props: Omit<ComponentProps<typeof CharacterSkillsMenuShell>, 'active'>) {
  return <CharacterSkillsMenuShell {...props} active="skills" />;
}
