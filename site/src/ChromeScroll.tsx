import React from "react";

import {
  MorphScroll,
  ResizeTracker,
  type BarConfig,
  type ControlsConfig,
  type MorphScrollHandle,
  type MorphScrollProps,
} from "morphing-scroll";

const TIP_RATIO = 0.5;
const round = (value: number) => Math.round(value * 100) / 100;

function ScrollThumb({ className }: { className?: string }) {
  const [box, setBox] = React.useState({ width: 0, height: 0 });

  const onResize = React.useCallback((rect: Partial<DOMRectReadOnly>) => {
    const width = round(rect.width ?? 0);
    const height = round(rect.height ?? 0);

    setBox((previous) =>
      previous.width === width && previous.height === height
        ? previous
        : { height, width },
    );
  }, []);

  const { height, width } = box;
  const tip = round(Math.min(width * TIP_RATIO, height / 2));
  const middle = round(width / 2);

  return (
    <span aria-hidden="true" className={`scroll-thumb ${className || ""}`}>
      <ResizeTracker
        className="scroll-thumb-frame"
        measure="outer"
        onResize={onResize}
      >
        {width > 0 && height > 0 && (
          <svg
            className="scroll-thumb-shape"
            focusable="false"
            preserveAspectRatio="none"
            viewBox={`0 0 ${width} ${height}`}
          >
            <path
              d={`M${middle} 0 ${width} ${tip}V${round(height - tip)}L${middle} ${height} 0 ${round(height - tip)}V${tip}Z`}
              fill="currentColor"
            />
          </svg>
        )}
      </ResizeTracker>
    </span>
  );
}

const bar = {
  element: <ScrollThumb />,
  edgeGap: 3,
  trackGap: 2,
  thumbMinSize: 32,
};

type ChromeScrollProps = Omit<MorphScrollProps, "controls" | "size"> & {
  children?: React.ReactNode;
  controls?: Omit<ControlsConfig, "bar"> & { bar?: Partial<BarConfig> };
  size?: MorphScrollProps["size"];
};

const ChromeScroll = React.forwardRef<MorphScrollHandle, ChromeScrollProps>(
  function ChromeScroll(
    { className, controls, size = "auto", ...rest },
    ref,
  ) {
    return (
      <MorphScroll
        className={className ? `chrome-scroll ${className}` : "chrome-scroll"}
        controls={{
          wheel: true,
          ...controls,
          bar: { ...bar, ...controls?.bar },
        }}
        ref={ref}
        size={size}
        {...rest}
      />
    );
  },
);

export default ChromeScroll;
