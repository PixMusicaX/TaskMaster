export function formatReliefTemp(temp?: string | null) {
  if (!temp) return "";
  return temp.split("°")[0].split(" ")[0];
}
