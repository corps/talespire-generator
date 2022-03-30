import {useCallback, useState} from "react";

export type Cell<T> = null | [T]
export function useCell<T>(): [Cell<T>, (t: T) => void] {
  const [cell, setCell] = useState(null as null | [T]);
  const setV = useCallback((v: T) => setCell([v]), [setCell]);
  return [cell, setV];
}
