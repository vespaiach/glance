export type PushPayload = { title: string; body: string; data: PushData };

export type PushData = { url: string };

type ShowScope = Pick<ServiceWorkerGlobalScope, "registration">;

const HOME = "/today";

const ICON = "/icon-192.png";

const WINDOWS: ClientQueryOptions = { type: "window", includeUncontrolled: true };

export async function showPush(scope: ShowScope, payload: unknown): Promise<void> {
  if (!isPushPayload(payload)) return;

  await scope.registration.showNotification(payload.title, {
    body: payload.body,
    data: payload.data,
    icon: ICON,
  });
}

export async function openPush(clients: Clients, data: unknown): Promise<void> {
  const url = isPushData(data) ? data.url : HOME;

  const [open] = (await clients.matchAll(WINDOWS)) as WindowClient[];

  if (open === undefined) {
    await clients.openWindow(url);

    return;
  }

  await open.focus();

  await open.navigate(url);
}

function isPushPayload(value: unknown): value is PushPayload {
  if (typeof value !== "object" || value === null) return false;

  const { title, body, data } = value as Partial<PushPayload>;

  return typeof title === "string" && typeof body === "string" && isPushData(data);
}

function isPushData(value: unknown): value is PushData {
  if (typeof value !== "object" || value === null) return false;

  const { url } = value as Partial<PushData>;

  return typeof url === "string" && /^\/(?![/\\])/.test(url);
}
