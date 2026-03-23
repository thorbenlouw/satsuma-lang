/**
 * satsuma agent-reference — Print the AI Agent Reference document.
 *
 * Outputs the full Satsuma agent reference (grammar, cheat sheet, CLI guide,
 * workflow patterns) for pasting into an agent's system prompt or instructions
 * file.  The content is baked in at build time from AI-AGENT-REFERENCE.md.
 */

import type { Command } from "commander";
import { agentReference } from "../generated/agent-reference.js";

export function register(program: Command): void {
  program
    .command("agent-reference")
    .description(
      "Print the AI Agent Reference — grammar, cheat sheet, CLI guide, and workflow patterns",
    )
    .action(() => {
      process.stdout.write(agentReference);
    });
}
