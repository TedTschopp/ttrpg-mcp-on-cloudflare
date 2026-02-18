export type PromptArgument = {
  name: string;
  description?: string;
  required?: boolean;
};

export type PromptDefinition = {
  name: string;
  title: string;
  description: string;
  arguments?: PromptArgument[];
};

export const PROMPT_DEFINITIONS: PromptDefinition[] = [
  {
    name: "session_prep",
    title: "Session Prep",
    description: "Prepare a complete game session with encounters, NPCs, and plot hooks",
    arguments: [
      { name: "party_level", description: "Party level (1-20)", required: true },
      { name: "session_theme", description: "Session theme keyword", required: true },
    ],
  },
  {
    name: "quick_npc",
    title: "Quick NPC",
    description: "Generate a complete NPC with name, personality, and background",
    arguments: [{ name: "role", description: "NPC role (e.g., innkeeper, guard)", required: true }],
  },
  {
    name: "dungeon_room",
    title: "Dungeon Room",
    description: "Generate a dungeon room with encounter, treasure, and description",
    arguments: [
      { name: "party_level", description: "Party level (1-20)", required: true },
      { name: "difficulty", description: "Encounter difficulty", required: false },
    ],
  },
];
