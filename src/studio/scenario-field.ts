/**
 * Studio controls use `scenario.`-prefixed paths for diagnostics and focus
 * navigation, while their update target is already the Scenario object.
 * Normalize that presentation prefix at the data boundary and clone before
 * writing so nested edits stay immutable.
 */
export function withScenarioField<T extends object>(scenario: T, fieldPath: string, value: unknown): T {
  const path = fieldPath.startsWith('scenario.') ? fieldPath.slice('scenario.'.length) : fieldPath;
  const segments = path.split('.').filter(Boolean);
  if (!segments.length) throw new Error('A scenario field path is required.');

  const next = structuredClone(scenario) as Record<string, unknown>;
  let target: Record<string, unknown> | unknown[] = next;

  for (const segment of segments.slice(0, -1)) {
    const key: string | number = Array.isArray(target) && /^\d+$/.test(segment) ? Number(segment) : segment;
    const child = (target as Record<string | number, unknown>)[key];
    if (!child || typeof child !== 'object') {
      throw new Error(`Scenario field path does not exist: ${fieldPath}`);
    }
    target = child as Record<string, unknown> | unknown[];
  }

  const leaf = segments[segments.length - 1];
  const key: string | number = Array.isArray(target) && /^\d+$/.test(leaf) ? Number(leaf) : leaf;
  if (!(key in target)) throw new Error(`Scenario field path does not exist: ${fieldPath}`);
  (target as Record<string | number, unknown>)[key] = value;
  return next as T;
}
