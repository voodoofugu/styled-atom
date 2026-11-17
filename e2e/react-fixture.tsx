import React from "react";
import { createPortal } from "react-dom";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server.browser";

import { createStyleCollector } from "../src";
import {
  createStyledAtomStore,
  StyledAtom,
  StyleCollectorProvider,
} from "../src/react";

declare global {
  interface Window {
    styledAtomFixtureReady?: boolean;
    styledAtomFixtureError?: string;
    styledAtomHydrationInitialColor?: string;
    styledAtomHydrationUpdatedColor?: string;
  }
}

const portalStyles = { color: "rgb(12, 34, 56)" };
const hydrationStyles = { color: "rgb(78, 90, 123)" };

const start = async () => {
  const frame = document.createElement("iframe");
  const frameLoaded = new Promise<void>((resolve) => {
    frame.addEventListener("load", () => resolve(), { once: true });
  });
  frame.srcdoc = '<main id="portal-target"></main>';
  document.body.append(frame);
  await frameLoaded;

  const portalTarget = frame.contentDocument!.querySelector("#portal-target")!;
  createRoot(document.querySelector("#portal-root")!).render(
    createPortal(
      <StyledAtom
        inlinePlacement
        name="portal-probe"
        style={portalStyles}
      >
        <span className="portal-probe" data-portal-probe="">
          portal
        </span>
      </StyledAtom>,
      portalTarget,
    ),
  );

  const collector = createStyleCollector();
  const serverStore = createStyledAtomStore({ namespace: "browser-hydration" });
  const serverApp = (
    <StyleCollectorProvider collector={collector}>
      <serverStore.StyledAtom
        name="hydration-probe"
        scope
        style={hydrationStyles}
      >
        <span data-hydration-probe="">hydrated</span>
      </serverStore.StyledAtom>
    </StyleCollectorProvider>
  );
  const hydrationRoot = document.querySelector("#hydration-root")!;
  hydrationRoot.innerHTML = renderToString(serverApp);
  document.head.insertAdjacentHTML("beforeend", collector.getStyleTags());
  const clientStore = createStyledAtomStore({ namespace: "browser-hydration" });
  const hydrationInput = {
    color: {
      toJSON: () => hydrationStyles.color,
      toString() {
        throw new Error("The client compiler ran during hydration.");
      },
    } as unknown as string,
  };
  let resolveHydrated!: () => void;
  const hydrated = new Promise<void>((resolve) => {
    resolveHydrated = resolve;
  });
  let hydrationReported = false;
  const clientApp = (style: typeof hydrationStyles) => (
    <clientStore.StyledAtom
      name="hydration-probe"
      onReady={() => {
        if (hydrationReported) return;
        hydrationReported = true;
        resolveHydrated();
      }}
      scope
      style={style}
    >
      <span data-hydration-probe="">hydrated</span>
    </clientStore.StyledAtom>
  );
  const root = hydrateRoot(hydrationRoot, clientApp(hydrationInput));

  await hydrated;
  const hydrationProbe = document.querySelector("[data-hydration-probe]")!;
  window.styledAtomHydrationInitialColor = getComputedStyle(hydrationProbe).color;
  root.render(clientApp({ color: "rgb(21, 43, 65)" }));
  for (let frame = 0; frame < 10; frame += 1) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    if (getComputedStyle(hydrationProbe).color === "rgb(21, 43, 65)") break;
  }
  window.styledAtomHydrationUpdatedColor = getComputedStyle(hydrationProbe).color;
  window.styledAtomFixtureReady = true;
};

void start().catch((error: unknown) => {
  window.styledAtomFixtureError =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error);
});
