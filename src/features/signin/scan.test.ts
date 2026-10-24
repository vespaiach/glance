import { CLOSED_SCAN, frameCrop, type ScanAction, type ScanState, scanReducer } from "./scan";

const ORIGIN = "https://glance.example.com";

const GLANCE_LINK = `${ORIGIN}/api/auth/verify?t=abc123`;

const read = (text: string): ScanAction => ({ type: "read", text, origin: ORIGIN });

const OPEN_STEPS: readonly ScanState[] = [
  { step: "ask" },
  { step: "asking", sheet: "ask" },
  { step: "asking" },
  { step: "blocked" },
  { step: "nocam" },
  { step: "scanning" },
  { step: "wrong" },
  { step: "found", token: "abc123" },
];

describe("scan reducer", () => {
  it("SIGNIN-21 the first tap asks before the phone's own prompt", () => {
    expect(scanReducer(CLOSED_SCAN, { type: "open", camera: "prompt" })).toEqual({ step: "ask" });
  });

  it("SIGNIN-20 a tap with camera access granted starts the camera without asking", () => {
    expect(scanReducer(CLOSED_SCAN, { type: "open", camera: "granted" })).toEqual({
      step: "asking",
    });
  });

  it("SIGNIN-21 a tap after camera access was denied shows Blocked", () => {
    expect(scanReducer(CLOSED_SCAN, { type: "open", camera: "denied" })).toEqual({
      step: "blocked",
    });
  });

  it("SIGNIN-21 a tap on a phone with no camera shows No camera", () => {
    expect(scanReducer(CLOSED_SCAN, { type: "open", camera: "none" })).toEqual({ step: "nocam" });
  });

  it("SIGNIN-22 a tap from the expired tile opens again", () => {
    expect(scanReducer({ step: "expired" }, { type: "open", camera: "prompt" })).toEqual({
      step: "ask",
    });
  });

  it("SIGNIN-21 Continue asks the phone while the ask sheet stays", () => {
    expect(scanReducer({ step: "ask" }, { type: "continue" })).toEqual({
      step: "asking",
      sheet: "ask",
    });
  });

  it("SIGNIN-21 Try again re-checks while the Blocked sheet stays", () => {
    expect(scanReducer({ step: "blocked" }, { type: "continue" })).toEqual({
      step: "asking",
      sheet: "blocked",
    });
  });

  it("SIGNIN-22 the camera starting opens the scanner", () => {
    expect(scanReducer({ step: "asking", sheet: "ask" }, { type: "started" })).toEqual({
      step: "scanning",
    });
  });

  it("SIGNIN-21 access denied at the prompt shows Blocked", () => {
    expect(scanReducer({ step: "asking", sheet: "ask" }, { type: "denied" })).toEqual({
      step: "blocked",
    });
  });

  it("SIGNIN-21 no camera found shows No camera", () => {
    expect(scanReducer({ step: "asking" }, { type: "no-camera" })).toEqual({ step: "nocam" });
  });

  it("SIGNIN-22 a Glance code in the frame is found", () => {
    expect(scanReducer({ step: "scanning" }, read(GLANCE_LINK))).toEqual({
      step: "found",
      token: "abc123",
    });
  });

  it("SIGNIN-22 any other code says it isn't a Glance code and keeps scanning", () => {
    expect(scanReducer({ step: "scanning" }, read("https://example.com/menu"))).toEqual({
      step: "wrong",
    });
  });

  it("SIGNIN-22 the same wrong code again keeps the tile as it is", () => {
    const wrong: ScanState = { step: "wrong" };

    expect(scanReducer(wrong, read("Hello"))).toBe(wrong);
  });

  it("SIGNIN-22 a Glance code read under the wrong tile is found", () => {
    expect(scanReducer({ step: "wrong" }, read(GLANCE_LINK))).toEqual({
      step: "found",
      token: "abc123",
    });
  });

  it("SIGNIN-22 the wrong tile clears after its 3 s", () => {
    expect(scanReducer({ step: "wrong" }, { type: "keep-scanning" })).toEqual({
      step: "scanning",
    });
  });

  it("SIGNIN-22 reads stop once a code is found", () => {
    const found: ScanState = { step: "found", token: "abc123" };

    expect(scanReducer(found, read(`${ORIGIN}/api/auth/verify?t=other`))).toBe(found);
  });

  it("SIGNIN-22 a code the server rejects closes onto the expired tile", () => {
    expect(scanReducer({ step: "found", token: "abc123" }, { type: "stale" })).toEqual({
      step: "expired",
    });
  });

  it("SIGNIN-22 the expired tile clears on the next keystroke or Send code", () => {
    expect(scanReducer({ step: "expired" }, { type: "dismiss" })).toEqual(CLOSED_SCAN);
  });

  it("SIGNIN-22 a check that fails for any other reason closes the scanner", () => {
    expect(scanReducer({ step: "found", token: "abc123" }, { type: "failed" })).toEqual(
      CLOSED_SCAN,
    );
  });

  it.each(OPEN_STEPS)(
    "SIGNIN-22 Cancel, going offline or the background closes it ($step)",
    (state) => {
      expect(scanReducer(state, { type: "close" })).toEqual(CLOSED_SCAN);
    },
  );

  it("SIGNIN-22 closing keeps the expired tile", () => {
    const expired: ScanState = { step: "expired" };

    expect(scanReducer(expired, { type: "close" })).toBe(expired);
  });

  it.each<ScanAction>([
    { type: "started" },
    { type: "denied" },
    { type: "stale" },
    read(GLANCE_LINK),
  ])("SIGNIN-22 a late $type after closing is ignored", (action) => {
    expect(scanReducer(CLOSED_SCAN, action)).toBe(CLOSED_SCAN);
  });
});

describe("frameCrop", () => {
  it("D33 maps the on-screen frame to video pixels under object-fit cover", () => {
    const view = { left: 0, top: 0, width: 400, height: 800 };
    const frame = { left: 100, top: 300, width: 200, height: 200 };

    expect(frameCrop(view, { width: 800, height: 800 }, frame)).toEqual({
      x: 300,
      y: 300,
      size: 200,
    });
  });

  it("D33 scales the crop with the video's resolution", () => {
    const view = { left: 0, top: 0, width: 400, height: 800 };
    const frame = { left: 100, top: 300, width: 200, height: 200 };

    expect(frameCrop(view, { width: 1600, height: 1600 }, frame)).toEqual({
      x: 600,
      y: 600,
      size: 400,
    });
  });
});
