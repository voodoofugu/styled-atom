import React from "react";
import { getAllStateValues, subscribeToAll } from "./globalStore";

const StateViewer = () => {
  React.useEffect(() => {
    // Сохраняем начальные значения состояния в sessionStorage
    const initialState = getAllStateValues();
    sessionStorage.getItem("proxy");
    if (!sessionStorage.getItem("proxy")) {
      sessionStorage.setItem("proxy", JSON.stringify(initialState));
    }

    // Подписываемся на изменения состояния
    const unsubscribe = subscribeToAll((updatedState) => {
      sessionStorage.setItem("proxy", JSON.stringify(updatedState));
    });

    // Отписка при размонтировании компонента
    return () => {
      unsubscribe();
      sessionStorage.removeItem("proxy");
    };
  }, []);

  return null;
};

export default StateViewer;
