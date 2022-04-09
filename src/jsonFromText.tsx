import React from 'react';
import {bindRight, catchErr} from "./either";
import {jsonAny} from "./autoproto";
import {AutoMemo} from "./automemo";

export const jsonFromText = new AutoMemo(catchErr((s: string) => JSON.parse(s)), "{}" as string)
	.map(bindRight(catchErr(v => jsonAny.encode(v, s => new Array(s)))));
