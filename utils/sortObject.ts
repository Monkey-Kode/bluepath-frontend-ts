export default function sortObject<T>(object: readonly T[]): T[] {
  return [...object].sort(
    (a, b) =>
      ((a as { order?: number | null }).order ?? 0) -
      ((b as { order?: number | null }).order ?? 0),
  );
}
