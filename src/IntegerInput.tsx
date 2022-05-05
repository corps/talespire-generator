import {AutoInput, bindParams} from "./autoinputs";
import {joinLeftRight, left, right} from "./either";
import {TextInput, TextInputProps} from "./inputs";

export const IntegerInput = (binds: Partial<TextInputProps> = {}) => AutoInput.renderWithErr(
	AutoInput.ident("").map(v => {
		const p = parseInt(v, 10);
		if ((p + "") === v) return right(p);
		return left(`${v} is not a valid integer`)
	}),
	bindParams(TextInput, binds)
).map(joinLeftRight(v => v, e => 0))

export const FloatInput = (binds: Partial<TextInputProps> = {}) => AutoInput.renderWithErr(
	AutoInput.ident("").map(v => {
		const p = parseFloat(v);
		if (!isNaN(p)) return right(p);
		return left(`${v} is not a valid float`)
	}),
	bindParams(TextInput, binds)
).map(joinLeftRight(v => v, e => 0))
