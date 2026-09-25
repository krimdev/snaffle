// Thrown by a runner when its AbortSignal fires, so the queue can tell "the user
// stopped this" apart from a real failure.
export class CancelledError extends Error {
  constructor() {
    super("Cancelled");
    this.name = "CancelledError";
  }
}
