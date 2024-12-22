type StyleData = Record<
  string,
  {
    fileNames?: string[];
    stylesLoaded?: boolean;
  }
>;
type StyleDataT = typeof initialState;
const initialState = {
  styleData: null as StyleData | null,
};

type Listener<T> = (value: T) => void;
type ListenersMap = Map<string, Set<Listener<StyleDataT[keyof StyleDataT]>>>;

let state: StyleDataT = {} as StyleDataT; // Инициализируем state с значениями по умолчанию
let proxyState: StyleDataT | null = null;

const listeners: ListenersMap = new Map();

const initializeState = (initialState: Partial<StyleDataT>) => {
  if (proxyState) return;
  // Обновляем состояние, создаём новый объект с объединением
  state = { ...state, ...initialState } as StyleDataT;

  proxyState = new Proxy(state, {
    get(target, key: string | symbol) {
      if (typeof key === "string" && key in target) {
        return target[key as keyof StyleDataT];
      }
      return undefined;
    },
    set(target, key: string | symbol, value: StyleDataT[keyof StyleDataT]) {
      if (typeof key === "string") {
        const currentValue = target[key as keyof StyleDataT];
        if (JSON.stringify(currentValue) !== JSON.stringify(value)) {
          target[key as keyof StyleDataT] = value; // Обновляем состояние

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
const getState = (): StyleDataT => {
  if (!proxyState) {
    console.warn(warning);
    return {} as StyleDataT;
  }
  return { ...proxyState };
};

const getAllStateValues = (): StyleDataT => {
  if (!proxyState) {
    console.warn(warning);
    return {} as StyleDataT;
  }

  return { ...proxyState };
};

const subscribe = <T,>(key: string, listener: Listener<T>): (() => void) => {
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  listeners.get(key)?.add(listener as Listener<StyleDataT[keyof StyleDataT]>);

  return () =>
    listeners
      .get(key)
      ?.delete(listener as Listener<StyleDataT[keyof StyleDataT]>);
};

const subscribeToAll = (listener: Listener<StyleDataT>): (() => void) => {
  const unsubscribeFunctions: (() => void)[] = [];

  for (const key in state) {
    unsubscribeFunctions.push(
      subscribe(key, () => {
        listener({ ...proxyState } as StyleDataT); // Возвращаем копию всего состояния
      })
    );
  }

  return () => {
    unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
  };
};

const setState = <K extends keyof StyleDataT>(
  key: K,
  value: StyleDataT[K]
): void => {
  if (!proxyState) {
    console.warn(warning);
    return;
  }
  proxyState[key] = value;
};

export {
  getState,
  getAllStateValues,
  subscribe,
  subscribeToAll,
  setState,
  StyleDataT,
};
