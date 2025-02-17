import { MainDataT } from "./types";

const initialState: Partial<MainDataT> = {
  styleData: null,
};

type Listener<T> = (value: T) => void;
type ListenersMap = Map<string, Set<Listener<MainDataT[keyof MainDataT]>>>;

let state: MainDataT = { ...initialState } as MainDataT;
const listeners: ListenersMap = new Map();

// Функция получения состояния
const getState = (): MainDataT => ({ ...state });

// Функция установки состояния
const setState = <K extends keyof MainDataT>(
  key: K,
  value: MainDataT[K]
): void => {
  if (JSON.stringify(state[key]) !== JSON.stringify(value)) {
    state[key] = value;

    // Уведомляем подписчиков
    const keyListeners = listeners.get(key as string);
    if (keyListeners) {
      keyListeners.forEach((listener) => listener(value));
    }
  }
};

// Функция подписки
const subscribe = <T,>(key: string, listener: Listener<T>): (() => void) => {
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  listeners.get(key)?.add(listener as Listener<MainDataT[keyof MainDataT]>);

  return () => {
    listeners
      .get(key)
      ?.delete(listener as Listener<MainDataT[keyof MainDataT]>);
  };
};

export { getState, subscribe, setState };
