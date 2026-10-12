import { clientIp, isAllowedOrigin } from "./guards";
import { createRateLimiter } from "./rateLimit";

const APP_URL = "https://glance.example.com";

describe("isAllowedOrigin", () => {
  it("tech§6.1 accepts a write from APP_URL's origin", () => {
    expect(isAllowedOrigin("https://glance.example.com", APP_URL)).toBe(true);
  });

  it("tech§6.1 rejects a write from another origin", () => {
    expect(isAllowedOrigin("https://evil.example.com", APP_URL)).toBe(false);
    expect(isAllowedOrigin("http://glance.example.com", APP_URL)).toBe(false);
  });

  it("tech§6.1 rejects a write with no Origin header", () => {
    expect(isAllowedOrigin(null, APP_URL)).toBe(false);
  });
});

describe("clientIp", () => {
  it("tech§6.2 takes the address the proxy appended last", () => {
    expect(clientIp("198.51.100.1, 203.0.113.5")).toBe("203.0.113.5");
  });

  it("tech§6.2 groups requests with no forwarded address together", () => {
    expect(clientIp(null)).toBe("unknown");
  });
});

describe("createRateLimiter", () => {
  const at = (ms: number) => new Date(Date.UTC(2026, 9, 9) + ms);

  it("tech§6.2 allows up to the limit within the window", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });

    expect([1, 2, 3].map(() => limiter.allow("a", at(0)))).toEqual([true, true, false]);
  });

  it("tech§6.2 counts each key on its own", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    limiter.allow("a", at(0));

    expect(limiter.allow("b", at(0))).toBe(true);
  });

  it("tech§6.2 allows again once the window has passed", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    limiter.allow("a", at(0));

    expect(limiter.allow("a", at(999))).toBe(false);
    expect(limiter.allow("a", at(1000))).toBe(true);
  });
});
