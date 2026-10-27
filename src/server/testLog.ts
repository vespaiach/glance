export type LoggedLine = Record<string, unknown>;

export function spyOnLoggedErrors(): () => LoggedLine[] {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});

  spy.mockClear();

  onTestFinished(() => spy.mockRestore());

  return () => spy.mock.calls.map(([line]) => JSON.parse(String(line)) as LoggedLine);
}
