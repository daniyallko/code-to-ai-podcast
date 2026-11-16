import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudioBackdrop } from "@/components/showcase/StudioBackdrop";

function fakeViewport(width: number, reducedMotion = false) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("min-width")
        ? width >= 768
        : query.includes("prefers-reduced-motion")
          ? reducedMotion
          : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
}

const realMatchMedia = window.matchMedia;
afterEach(() => {
  cleanup();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: realMatchMedia,
  });
});

describe("StudioBackdrop", () => {
  it("keeps the still frame on phones and never loads the clip", () => {
    fakeViewport(390);
    render(<StudioBackdrop />);

    const still = document.querySelector('img[src="/assets/studio/rainy-window.webp"]');
    expect(still).toBeInTheDocument();
    expect(document.querySelector("video")).toBeNull();
  });

  it("plays the looping clip on desktop", () => {
    fakeViewport(1280);
    render(<StudioBackdrop />);

    const clip = document.querySelector("video.murmur-video");
    expect(clip).toBeInTheDocument();
    expect(clip?.querySelector('source[src="/assets/studio/rainy-window.mp4"]')).toBeInTheDocument();
  });

  it("keeps the still frame for reduced-motion visitors on desktop", () => {
    fakeViewport(1280, true);
    render(<StudioBackdrop />);

    expect(document.querySelector("video")).toBeNull();
    expect(
      document.querySelector('img[src="/assets/studio/rainy-window.webp"]'),
    ).toBeInTheDocument();
  });
});
