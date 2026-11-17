import { StyledAtom } from "styled-atom/react";

import { HydrationProbe } from "./hydration-probe";

export const dynamic = "force-dynamic";

const serverStyle = {
  color: "rgb(38, 85, 115)",
  fontFamily: "sans-serif",
};

export default function Page() {
  return (
    <main>
      <p data-server-component="">Rendered by an App Router Server Component</p>
      <StyledAtom
        inlinePlacement
        name="next-server-card"
        scope
        style={serverStyle}
      >
        <section data-server-card="">Direct package client boundary</section>
      </StyledAtom>
      <HydrationProbe />
    </main>
  );
}
