type StyleData = Record<
  string,
  {
    fileNames?: string[];
    stylesLoaded?: boolean;
  }
>;
const initialState = {
  styleData: null as StyleData | null,
};

// Глобальный интерфейс для состояний
declare global {
  interface IStatesT {
    styleData: StyleData | null;
  }
}

type Listener<T> = (value: T) => void;
type ListenersMap = Map<string, Set<Listener<IStatesT[keyof IStatesT]>>>;

let state: IStatesT = {} as IStatesT; // Инициализируем state с значениями по умолчанию
let proxyState: IStatesT | null = null;

const listeners: ListenersMap = new Map();

const initializeState = (initialState: Partial<IStatesT>) => {
  if (proxyState) return;
  // Обновляем состояние, создаём новый объект с объединением
  state = { ...state, ...initialState } as IStatesT;

  proxyState = new Proxy(state, {
    get(target, key: string | symbol) {
      if (typeof key === "string" && key in target) {
        return target[key as keyof IStatesT];
      }
      return undefined;
    },
    set(target, key: string | symbol, value: IStatesT[keyof IStatesT]) {
      if (typeof key === "string") {
        const currentValue = target[key as keyof IStatesT];
        if (JSON.stringify(currentValue) !== JSON.stringify(value)) {
          target[key as keyof IStatesT] = value; // Обновляем состояние

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

const subscribe = <T,>(key: string, listener: Listener<T>): (() => void) => {
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  listeners.get(key)?.add(listener as Listener<IStatesT[keyof IStatesT]>);

  return () =>
    listeners.get(key)?.delete(listener as Listener<IStatesT[keyof IStatesT]>);
};

const getState = (): IStatesT => {
  if (!proxyState) {
    console.warn("State is not initialized yet.");
    return {} as IStatesT;
  }
  return { ...proxyState };
};

const getAllStateValues = (): IStatesT => {
  if (!proxyState) {
    console.warn("State is not initialized yet.");
    return {} as IStatesT;
  }

  return { ...proxyState };
};

const subscribeToAll = (listener: Listener<IStatesT>): (() => void) => {
  const unsubscribeFunctions: (() => void)[] = [];

  for (const key in state) {
    unsubscribeFunctions.push(
      subscribe(key, () => {
        listener({ ...proxyState } as IStatesT); // Возвращаем копию всего состояния
      })
    );
  }

  return () => {
    unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
  };
};

const setState = <K extends keyof IStatesT>(
  key: K,
  value: IStatesT[K]
): void => {
  if (!proxyState) {
    console.warn("State is not initialized yet.");
    return;
  }
  proxyState[key] = value;
};

export { getState, getAllStateValues, subscribeToAll, setState, subscribe };
