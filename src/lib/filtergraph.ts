export function filterExcerpt(filterComplex: string, filterName: string): string | null {
  return (
    filterComplex
      .split(";")
      .map((chain) => chain.trim())
      .find((chain) => chain.includes(filterName)) ?? null
  );
}
