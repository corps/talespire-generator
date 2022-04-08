import {Dispatch, useCallback, useState} from "react";

export function useLocalStorage<V>(v: V, key: string): [V, Dispatch<V>] {
	const [state, _setState] = useState(() => {
		if (key in localStorage) {
			try {
				return JSON.parse(localStorage[key]) as V;
			} catch {}
		}

		return v;
	});

	const setState = useCallback((v: V) => {
		localStorage[key] = JSON.stringify(v);
		_setState(v)
	}, [key]);

	return [state, setState];
}
