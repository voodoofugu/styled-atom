"use client";

import { useEffect, useMemo, useState } from "react";

import {
  StaticAtom,
  StyledAtom,
  type StyledAtomStyles,
} from "styled-atom/react";

const initialColor = "rgb(96, 64, 160)";
const updatedColor = "rgb(12, 118, 92)";

export function HydrationProbe() {
  const [hydrated, setHydrated] = useState(false);
  const [updated, setUpdated] = useState(false);
  const style = useMemo<StyledAtomStyles>(
    () => ({
      color: updated
        ? updatedColor
        : typeof window === "undefined"
          ? initialColor
          : ({
              toJSON: () => initialColor,
              toString() {
                throw new Error(
                  "The Next.js fixture compiled matching CSS during hydration.",
                );
              },
            } as unknown as string),
      borderColor: "currentcolor",
    }),
    [updated],
  );

  useEffect(() => setHydrated(true), []);

  return (
    <>
      <StyledAtom
        inlinePlacement
        name="next-hydration-card"
        scope
        style={style}
      >
        <section
          data-hydrated={hydrated ? "true" : "false"}
          data-hydration-card=""
        >
          <span>Hydration probe</span>
          <button onClick={() => setUpdated(true)} type="button">
            update style
          </button>
        </section>
      </StyledAtom>
      <StaticAtom
        href="/static-card.css"
        name="next-static-card"
        scope
      >
        <section data-static-card="">Static stylesheet probe</section>
      </StaticAtom>
    </>
  );
}
