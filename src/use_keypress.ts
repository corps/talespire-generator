// Hook
import {useEffect, useState} from "react";

export function useKeyPress(targetKey: string) {
	const [keyPressed, setKeyPressed] = useState(false);
	useEffect(() => {
		const downHandler = ({ key }: any) => key === targetKey ? setKeyPressed(true) : false;
		const upHandler = ({ key }: any) => key === targetKey ? setKeyPressed(false) : false;
		window.addEventListener("keydown", downHandler);
		window.addEventListener("keyup", upHandler);
		return () => {
			window.removeEventListener("keydown", downHandler);
			window.removeEventListener("keyup", upHandler);
		};
	}, [targetKey]);
	return keyPressed;
}
