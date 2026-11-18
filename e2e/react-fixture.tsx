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
    styledAtomStaticHydrationColor?: string;
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
  const stylesheetHref = "/e2e/link-asset.css?version=red&cache=1";
  const serverStore = createStyledAtomStore({
    namespace: "browser-hydration",
    stylesheets: { "static-probe": stylesheetHref },
  });
  const serverApp = (
    <StyleCollectorProvider collector={collector}>
      <>
        <serverStore.StyledAtom
          name="hydration-probe"
          scope
          style={hydrationStyles}
        >
          <span data-hydration-probe="">hydrated</span>
        </serverStore.StyledAtom>
        <serverStore.StaticAtom files="static-probe" scope="link-probe">
          <span data-static-hydration-probe="">static hydrated</span>
        </serverStore.StaticAtom>
      </>
    </StyleCollectorProvider>
  );
  const hydrationRoot = document.querySelector("#hydration-root")!;
  hydrationRoot.innerHTML = renderToString(serverApp);
  document.head.insertAdjacentHTML("beforeend", collector.getStyleTags());
  const clientStore = createStyledAtomStore({
    namespace: "browser-hydration",
    stylesheets: { "static-probe": stylesheetHref },
  });
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
  const readyAtoms = new Set<string>();
  const reportReady = (name: string) => {
    readyAtoms.add(name);
    if (readyAtoms.size === 2) resolveHydrated();
  };
  const clientApp = (style: typeof hydrationStyles) => (
    <>
      <clientStore.StyledAtom
        name="hydration-probe"
        onReady={() => reportReady("dynamic")}
        scope
        style={style}
      >
        <span data-hydration-probe="">hydrated</span>
      </clientStore.StyledAtom>
      <clientStore.StaticAtom
        files="static-probe"
        onReady={() => reportReady("static")}
        scope="link-probe"
      >
        <span data-static-hydration-probe="">static hydrated</span>
      </clientStore.StaticAtom>
    </>
  );
  const root = hydrateRoot(hydrationRoot, clientApp(hydrationInput));

  await hydrated;
  const hydrationProbe = document.querySelector("[data-hydration-probe]")!;
  const staticProbe = document.querySelector("[data-static-hydration-probe]")!;
  for (let frame = 0; frame < 10; frame += 1) {
    if (getComputedStyle(staticProbe).color === "rgb(180, 32, 48)") break;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
  window.styledAtomHydrationInitialColor = getComputedStyle(hydrationProbe).color;
  window.styledAtomStaticHydrationColor = getComputedStyle(staticProbe).color;
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
