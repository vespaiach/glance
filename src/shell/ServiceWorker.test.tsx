import { render } from "@testing-library/react";
import { ServiceWorker } from "./ServiceWorker";

const sw = vi.hoisted(() => ({ register: vi.fn() }));

vi.mock("@/data/repos", () => ({ appServiceWorker: () => sw }));

describe("ServiceWorker", () => {
  it("D16 registers the app's service worker once mounted, drawing nothing", () => {
    const { container } = render(<ServiceWorker />);

    expect(sw.register).toHaveBeenCalledTimes(1);
    expect(container).toBeEmptyDOMElement();
  });
});
