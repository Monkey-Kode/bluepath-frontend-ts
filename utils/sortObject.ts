export default <T extends { order?: number | null }>(object: readonly T[]) => {
  return [...object].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );
};
