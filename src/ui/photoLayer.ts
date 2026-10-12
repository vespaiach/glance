export function photoLayer(dim: number, src: string): string {
  const shade = `rgba(0, 0, 0, ${dim})`;

  return `linear-gradient(${shade}, ${shade}), url("${src}")`;
}
