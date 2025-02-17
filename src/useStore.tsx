import React from "react";
import { MainDataT } from "./types";

import { getState, setState, subscribe } from "./store";

const useStore = <K extends keyof MainDataT>(
  stateKey: K
): [
  MainDataT[K],
  (update: ((prevState: MainDataT[K]) => MainDataT[K]) | MainDataT[K]) => void
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
    (update: ((prevState: MainDataT[K]) => MainDataT[K]) | MainDataT[K]) => {
      const currentState = getSnapshot();
      const newState =
        typeof update === "function"
          ? (update as (prevState: MainDataT[K]) => MainDataT[K])(currentState)
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
