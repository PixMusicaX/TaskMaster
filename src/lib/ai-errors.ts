// Why an AI answer could not be had. Every one of these means "carry on without the AI": the
// daily generators fall back to their offline picks, and the Taskmaster says which it was.
export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

// The player has not added a key for the provider they picked
export class AiNotConfiguredError extends AiUnavailableError {
  constructor() {
    super("No AI key set for this account");
    this.name = "AiNotConfiguredError";
  }
}

// The player has used up today's AI requests (see AI_DAILY_BUDGET in lib/ai-guard.ts)
export class AiBudgetError extends AiUnavailableError {
  constructor() {
    super("Today's AI budget is spent");
    this.name = "AiBudgetError";
  }
}

// The provider took longer than the caller could wait
export class AiTimeoutError extends AiUnavailableError {
  constructor() {
    super("The AI took too long to answer");
    this.name = "AiTimeoutError";
  }
}
