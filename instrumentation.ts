export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { bootServer } = await import("@/server/boot");

  await bootServer();
}
