import React from "react";
import useStore from "./useStore";

import { StyleDataT, ImportStyleT } from "./types";

const arraysEqual = (arr1: string[], arr2: string[]) =>
  arr1.length === arr2.length && arr1.every((v, i) => v === arr2[i]);

const clearStyles = ({
  id,
  fileNames,
}: {
  id: string;
  fileNames?: string[];
}) => {
  if (fileNames) {
    fileNames.forEach((el) => {
      const element = document.head.querySelector(`style[name="${el}"]`);
      if (element) {
        element.remove();
      }
    });
  }
  if (id && !fileNames) {
    // const escapedId = CSS.escape(id);
    const elements = document.head.querySelectorAll(`style[atom="${id}"]`);
    elements.forEach((el) => {
      el.remove();
    });
  }
};

const createStateTag = (id: string, fileName: string) => {
  let styleElement = document.head.querySelector(
    `style[name="${fileName}"]`
  ) as HTMLStyleElement;
  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.setAttribute("atom", id);
    styleElement.setAttribute("name", fileName);
    document.head.appendChild(styleElement);
  }

  return styleElement;
};

const loadStyles = async (
  styleObj: {
    [key: string]: { fileNames?: string[]; loaded?: boolean };
  },
  prevStyleData: { fileNames?: string[]; loaded?: boolean },
  importStyle: ImportStyleT,
  setStyleData: (
    update: StyleDataT | ((prevState: StyleDataT) => StyleDataT) | null
  ) => void,
  counter: React.MutableRefObject<Record<string, number>>
) => {
  const id = Object.keys(styleObj)[0];
  const { fileNames, loaded } = styleObj[id];

  if (!fileNames || fileNames.length === 0) {
    console.warn(`No files to load for id "${id}"`, "\n", "✦styledAtom✦");
    return;
  }

  fileNames.forEach((fileName) => {
    if (!(fileName in counter.current)) {
      counter.current[fileName] = 0;
    }
  });

  for (const fileName of fileNames) {
    const styleElement = createStateTag(id, fileName);
    try {
      const { default: cssData } = await importStyle(fileName);
      styleElement.textContent = cssData;
      counter.current[fileName] += 1;
    } catch (error) {
      console.error(
        `Loading failed for "${fileName}" style`,
        "\n",
        error,
        "\n",
        "✦styledAtom✦"
      );
      styleElement.textContent = "⛔︎";
      counter.current[fileName] += 1;
    } finally {
      const allFilesLoaded = fileNames.every(
        (fileName) => counter.current[fileName] > 0
      );

      if (
        (!prevStyleData ||
          !arraysEqual(prevStyleData?.fileNames || [], fileNames || []) ||
          !loaded) &&
        allFilesLoaded
      ) {
        setStyleData((prevState) => ({
          ...prevState,
          [id]: {
            ...prevState?.[id],
            loaded: true,
          },
        }));

        fileNames.forEach((fileName) => {
          delete counter.current[fileName];
        });
      }
    }
  }
};

const useDynamicStyle = (importStyle: ImportStyleT) => {
  const [styleData, setStyleData] = useStore("styleData");

  const prevStyleArrayRef = React.useRef<StyleDataT>({});
  const counter = React.useRef<Record<string, number>>({});

  const loadStyleObject = (styleData: StyleDataT) => {
    Object.entries(styleData ?? {}).forEach(([id, styleData]) => {
      const prevStyleData = prevStyleArrayRef.current?.[id];

      let removedFileNames: string[] = [];
      if (prevStyleData) {
        const prevFileNames = prevStyleData.fileNames || [];
        const newFileNames = styleData.fileNames || [];
        removedFileNames = prevFileNames.filter(
          (fileName) => !newFileNames.includes(fileName)
        );
      }

      // Теперь передаем в loadStyles объект с ключом id и значением
      loadStyles(
        { [id]: styleData },
        prevStyleData || {},
        importStyle,
        setStyleData,
        counter
      );

      if (prevStyleData && removedFileNames.length > 0) {
        clearStyles({ id, fileNames: removedFileNames });
      }
    });
  };

  React.useEffect(() => {
    const prevIds = Object.keys(prevStyleArrayRef.current ?? {});

    const currentIds = styleData ? Object.keys(styleData) : [];
    const removedIds = prevIds.filter((id) => !currentIds.includes(id));

    removedIds.forEach((id) => clearStyles({ id }));

    if (styleData) {
      loadStyleObject(styleData);
    }

    prevStyleArrayRef.current = { ...styleData };
  }, [styleData]);
};

export default useDynamicStyle;
