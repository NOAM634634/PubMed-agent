export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: { retries?: number; baseDelayMs?: number; label?: string }
): Promise<T> {
  const retries = options?.retries ?? 4;
  const baseDelayMs = options?.baseDelayMs ?? 1000;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === retries) break;
      const delay = baseDelayMs * Math.pow(2, attempt);
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `  retry ${attempt + 1}/${retries} for ${options?.label ?? 'request'} after error: ${message}. waiting ${delay}ms...`
      );
      await sleep(delay);
    }
  }

  throw lastError;
}
