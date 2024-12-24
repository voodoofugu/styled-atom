import { MainDataT } from "./types";

const initialState = {
  styleData: null,
};

type Listener<T> = (value: T) => void;
type ListenersMap = Map<string, Set<Listener<MainDataT[keyof MainDataT]>>>;

let state: MainDataT;
let proxyState: MainDataT;

const listeners: ListenersMap = new Map();

const initializeState = (initialState: Partial<MainDataT>) => {
  if (proxyState) return;
  // Обновляем состояние, создаём новый объект с объединением
  state = { ...state, ...initialState } as MainDataT;

  proxyState = new Proxy(state, {
    get(target, key: string | symbol) {
      if (typeof key === "string" && key in target) {
        return target[key as keyof MainDataT];
      }
      return undefined;
    },
    set(target, key: string | symbol, value: MainDataT[keyof MainDataT]) {
      if (typeof key === "string") {
        const currentValue = target[key as keyof MainDataT];
        if (JSON.stringify(currentValue) !== JSON.stringify(value)) {
          target[key as keyof MainDataT] = value; // Обновляем состояние

          // Уведомляем подписчиков
          const keyListeners = listeners.get(key);
          if (keyListeners) {
            keyListeners.forEach((listener) => listener(value));
          }
        }
        return true;
      }
      return false;
    },
  });
};
initializeState(initialState);

const warning = "State is not initialized yet 👺";

// exported functions
const getState = (): MainDataT => {
  if (!proxyState) {
    console.warn(warning);
    return {} as MainDataT;
  }
  return { ...proxyState };
};

const getAllStateValues = (): MainDataT => {
  if (!proxyState) {
    console.warn(warning);
    return {} as MainDataT;
  }

  return { ...proxyState };
};

const subscribe = <T,>(key: string, listener: Listener<T>): (() => void) => {
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  listeners.get(key)?.add(listener as Listener<MainDataT[keyof MainDataT]>);

  return () =>
    listeners
      .get(key)
      ?.delete(listener as Listener<MainDataT[keyof MainDataT]>);
};

const subscribeToAll = (listener: Listener<MainDataT>): (() => void) => {
  const unsubscribeFunctions: (() => void)[] = [];

  for (const key in state) {
    unsubscribeFunctions.push(
      subscribe(key, () => {
        listener({ ...proxyState } as MainDataT); // Возвращаем копию всего состояния
      })
    );
  }

  return () => {
    unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
  };
};

const setState = <K extends keyof MainDataT>(
  key: K,
  value: MainDataT[K]
): void => {
  if (!proxyState) {
    console.warn(warning);
    return;
  }
  proxyState[key] = value;
};

export { getState, getAllStateValues, subscribe, subscribeToAll, setState };
