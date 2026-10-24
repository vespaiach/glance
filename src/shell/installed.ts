export function isInstalledApp(): boolean {
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;

  return (
    standalone ||
    matchMedia("(display-mode: fullscreen)").matches ||
    matchMedia("(display-mode: standalone)").matches
  );
}
