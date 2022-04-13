import React from 'react';
import {bindRight, catchErr, joinLeftRight, mapLeft} from "./either";
import {jsonAny} from "./autoproto";
import {AutoInput, bindParams} from "./autoinputs";
import {TextInput, TextInputProps} from "./inputs";

export const JsonInput = (binds: Partial<TextInputProps> = {}) => AutoInput.renderWithErr(
	AutoInput.lift("{}", "{}")
		.map(catchErr(s => JSON.parse(s)))
		.map(bindRight(catchErr(v => jsonAny.encode(v, s => new Array(s)))))
		.map(mapLeft(err => "Invalid json")),
	bindParams(TextInput, binds)
)
