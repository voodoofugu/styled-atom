import React from "react";
import { getState, setState, subscribe, StyleDataT } from "./proxyStyleData";

const useStore = <K extends keyof StyleDataT>(
  stateKey: K
): [
  StyleDataT[K],
  (
    update: ((prevState: StyleDataT[K]) => StyleDataT[K]) | StyleDataT[K]
  ) => void
] => {
  // Селектор для получения значения по ключу
  const getSnapshot = () => getState()[stateKey];

  // Подписка на изменения
  const subscribeToStore = (callback: () => void) =>
    subscribe(stateKey, callback);

  const state = React.useSyncExternalStore(
    subscribeToStore,
    getSnapshot,
    getSnapshot // В SSR возвращаем текущее состояние
  );

  // Функция для обновления состояния
  const updateGlobalState = React.useCallback(
    (update: ((prevState: StyleDataT[K]) => StyleDataT[K]) | StyleDataT[K]) => {
      const currentState = getSnapshot();
      const newState =
        typeof update === "function"
          ? (update as (prevState: StyleDataT[K]) => StyleDataT[K])(
              currentState
            )
          : update;

      // Устанавливаем новое состояние только при изменении
      if (!Object.is(currentState, newState)) {
        setState(stateKey, newState);
      }
    },
    [stateKey]
  );

  return [state, updateGlobalState];
};

export default useStore;
