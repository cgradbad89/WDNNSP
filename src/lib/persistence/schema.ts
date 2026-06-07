export const CURRENT_PERSISTENCE_VERSION = 1;

export interface PersistedEnvelope<T> {
  version: number;
  data: T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createPersistedEnvelope<T>(
  data: T,
): PersistedEnvelope<T> {
  return {
    version: CURRENT_PERSISTENCE_VERSION,
    data,
  };
}

export function unwrapPersistedEnvelope<T>(
  value: unknown,
  validator: (data: unknown) => data is T,
): T | undefined {
  if (!isRecord(value) || value.version !== CURRENT_PERSISTENCE_VERSION) {
    return undefined;
  }

  return validator(value.data) ? value.data : undefined;
}
