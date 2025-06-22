/**
 * Handles errors by logging them to the console with a custom message.
 * @param message - The custom message to prepend to the error
 * @param error - The error object or unknown error
 */
export function handleError(message: string, error: unknown): void {
  if (error instanceof Error) {
    console.error(message, error.message);
  } else {
    console.error(message, 'Unknown error occurred');
  }
}
