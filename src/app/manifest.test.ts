import manifest from "./manifest";

test("tech§4.5 the manifest lists the handoff's any and maskable icons", () => {
  expect(manifest().icons).toEqual([
    { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ]);
});

test("tech§4.5 the manifest splash matches the icon background", () => {
  expect(manifest().background_color).toBe("#c8e6cd");
});
