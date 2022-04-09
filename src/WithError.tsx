import {Either, joinLeftRight} from "./either";
import React from "react";
import {Alert} from "@mui/material";

export function ShowResult<T>({value}: { value: Either<React.ReactElement | null, string> }) {
	return joinLeftRight<React.ReactElement | null, string, React.ReactElement | null>(
		el => el,
		err => null
	)(value)
}

export function ShowError<T>({value}: { value: Either<any, string> }) {
	return joinLeftRight<React.ReactElement | null, string, React.ReactElement | null>(
		el => null,
		err => <Alert severity="warning">{err}</Alert>
	)(value)
}
