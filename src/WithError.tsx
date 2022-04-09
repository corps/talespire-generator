import {Either, joinLeftRight} from "./either";
import React from "react";

export function ShowResult<T>({value}: { value: Either<React.ReactElement | null, string> }) {
	return joinLeftRight<React.ReactElement | null, string, React.ReactElement | null>(
		el => el,
		err => null
	)(value)
}
