export type ThisPhone =
  | { kind: "unsupported" }
  | { kind: "ask" }
  | { kind: "asking" }
  | { kind: "denied" }
  | { kind: "on" }
  | { kind: "turning-off" };

export type ThisPhoneAction =
  | {
      type: "checked";
      supported: boolean;
      permission: NotificationPermission;
      subscribed: boolean;
    }
  | { type: "allow" }
  | { type: "allowed" }
  | { type: "blocked" }
  | { type: "failed" }
  | { type: "turn-off" }
  | { type: "turned-off" };

const ASK: ThisPhone = { kind: "ask" };

export function thisPhone(phone: ThisPhone, action: ThisPhoneAction): ThisPhone {
  switch (action.type) {
    case "checked":
      return checkedPhone(action);
    case "allow":
      return phone.kind === "ask" ? { kind: "asking" } : phone;
    case "allowed":
      return phone.kind === "asking" ? { kind: "on" } : phone;
    case "blocked":
      return phone.kind === "asking" ? { kind: "denied" } : phone;
    case "failed":
      return phone.kind === "asking" ? ASK : phone;
    case "turn-off":
      return phone.kind === "on" ? { kind: "turning-off" } : phone;
    case "turned-off":
      return phone.kind === "turning-off" ? ASK : phone;
  }
}

function checkedPhone({
  supported,
  permission,
  subscribed,
}: Extract<ThisPhoneAction, { type: "checked" }>): ThisPhone {
  if (!supported) return { kind: "unsupported" };

  if (permission === "denied") return { kind: "denied" };

  return permission === "granted" && subscribed ? { kind: "on" } : ASK;
}
