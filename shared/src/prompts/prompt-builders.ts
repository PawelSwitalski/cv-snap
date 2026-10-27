import type { PromptBuilders } from "../prompts.js";
import { buildProfilePrompt } from "./profile.js";
import { buildRequirementsPrompt } from "./requirements.js";
import { buildTailorPrompt } from "./tailor.js";

/** The prompt builders the native host's `ClaudeCodeProvider` uses (bolt 005). */
export const promptBuilders: PromptBuilders = {
  profile: buildProfilePrompt,
  requirements: buildRequirementsPrompt,
  tailor: buildTailorPrompt,
};
