import { type ThisPhone, type ThisPhoneAction, thisPhone } from "./thisPhone";

const UNSUPPORTED: ThisPhone = { kind: "unsupported" };

const ASK: ThisPhone = { kind: "ask" };

const ASKING: ThisPhone = { kind: "asking" };

const ON: ThisPhone = { kind: "on" };

const TURNING_OFF: ThisPhone = { kind: "turning-off" };

const checked = (
  supported: boolean,
  permission: NotificationPermission,
  subscribed: boolean,
): ThisPhoneAction => ({ type: "checked", supported, permission, subscribed });

describe("thisPhone", () => {
  it("NOTIF-08 stays unsupported where push is missing", () => {
    expect(thisPhone(UNSUPPORTED, checked(false, "default", false))).toEqual(UNSUPPORTED);
  });

  it("NOTIF-08 asks when permission was never given", () => {
    expect(thisPhone(UNSUPPORTED, checked(true, "default", false))).toEqual(ASK);
  });

  it("NOTIF-08 asks when allowed but this device has no subscription", () => {
    expect(thisPhone(UNSUPPORTED, checked(true, "granted", false))).toEqual(ASK);
  });

  it("NOTIF-08 reads denied when the browser blocks notifications", () => {
    expect(thisPhone(UNSUPPORTED, checked(true, "denied", false))).toEqual({ kind: "denied" });
  });

  it("NOTIF-08 reads on when allowed and subscribed", () => {
    expect(thisPhone(UNSUPPORTED, checked(true, "granted", true))).toEqual(ON);
  });

  it("NOTIF-08 Allow notifications asks, then turns on once subscribed", () => {
    const asking = thisPhone(ASK, { type: "allow" });

    expect(asking).toEqual(ASKING);
    expect(thisPhone(asking, { type: "allowed" })).toEqual(ON);
  });

  it("NOTIF-08 a blocked prompt reads denied", () => {
    expect(thisPhone(ASKING, { type: "blocked" })).toEqual({ kind: "denied" });
  });

  it("NOTIF-08 a dismissed prompt or failed subscribe goes back to ask", () => {
    expect(thisPhone(ASKING, { type: "failed" })).toEqual(ASK);
  });

  it("NOTIF-08 Turn off goes through turning off back to ask", () => {
    const turning = thisPhone(ON, { type: "turn-off" });

    expect(turning).toEqual(TURNING_OFF);
    expect(thisPhone(turning, { type: "turned-off" })).toEqual(ASK);
  });

  it("NOTIF-08 ignores Allow and Turn off from the wrong state", () => {
    expect(thisPhone(ON, { type: "allow" })).toEqual(ON);
    expect(thisPhone(ASK, { type: "turn-off" })).toEqual(ASK);
    expect(thisPhone(TURNING_OFF, { type: "allowed" })).toEqual(TURNING_OFF);
  });
});
