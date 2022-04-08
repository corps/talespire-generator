import React from 'react';
import {AutoInput} from "./autoinputs";
import {catchErr} from "./either";
import {Text} from "./TextAreaInput";
import {jsonAny} from "./autoproto";
const {withError} = AutoInput;

export const JsonInput =
	withError(withError(Text.map(catchErr(JSON.parse)), {})
		.map(catchErr(v => jsonAny.encode(v, (s) => new Array(s)))), []);
