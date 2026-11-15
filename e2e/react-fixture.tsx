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
        name="portal-probe"
        placement="inline"
        styles={portalStyles}
      >
        <span className="portal-probe" data-portal-probe="">
          portal
        </span>
      </StyledAtom>,
      portalTarget,
    ),
  );

  const collector = createStyleCollector();
  const store = createStyledAtomStore({ namespace: "browser-hydration" });
  const app = (
    <StyleCollectorProvider collector={collector}>
      <store.StyledAtom
        name="hydration-probe"
        scope
        styles={hydrationStyles}
      >
        <span data-hydration-probe="">hydrated</span>
      </store.StyledAtom>
    </StyleCollectorProvider>
  );
  const hydrationRoot = document.querySelector("#hydration-root")!;
  hydrationRoot.innerHTML = renderToString(app);
  document.head.insertAdjacentHTML("beforeend", collector.getStyleTags());
  hydrateRoot(hydrationRoot, app);

  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  window.styledAtomFixtureReady = true;
};

void start();
