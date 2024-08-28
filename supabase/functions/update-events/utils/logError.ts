export class LogError extends Error {
  constructor(message: string, error: Partial<Error> | undefined = undefined) {
    console.error(message + ":", error);
    super(message + ": " + error?.message);
  }
}
