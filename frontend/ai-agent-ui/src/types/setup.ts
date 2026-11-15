export type SetupSection = "goals" | "tones" | "prompts";

export type SavedSection = "goals" | "tones";

export type GoalSetting = {
  id: string;
  title: string;
  description: string;
  color: string;
  enabled: boolean;
  locked: boolean;
};

export type ToneSetting = {
  id: string;
  title: string;
  description: string;
  color: string;
  enabled: boolean;
  locked: boolean;
};

export type ToneMapping = {
  goal: string;
  tone: string;
};

export type PromptRow = {
  id: number;
  author: string;
  initials: string;
  created: string;
  enabled?: boolean;
  instruction?: string;
  flag?: string;
  isEditing?: boolean;
  isNew?: boolean;
  draftInstruction?: string;
  originalInstruction?: string;
};
