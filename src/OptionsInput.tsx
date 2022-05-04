import {AutoInput, RecordFromAutoInputs} from "./autoinputs";
import {SelectInputWithOptions} from "./inputs";

export function OptionsInput<Result, T extends Record<string, AutoInput<any, Result>>>(t: T) {
	const DropDown = AutoInput.fromComponent(SelectInputWithOptions(t), Object.keys(t)[0]);

	const defaults: RecordFromAutoInputs<T> = {} as any;
	for (let k in t) {
		defaults[k] = t[k].defaultState;
	}

	return new AutoInput<[keyof T, RecordFromAutoInputs<T>], Result>(
		([k, inputs]) => t[k].output(inputs[k]),
		[DropDown.defaultState, defaults],
		([k, states], onChange) => {
			return <>
				{DropDown.render(k, newK => onChange([newK, states]))}
				{t[k].render(states[k], newState => onChange([k, {...states, [k]: newState}]))}
			</>
		}
	)
}
