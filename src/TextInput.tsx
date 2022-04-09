import React, {ChangeEvent, Dispatch, useCallback} from "react";
import {TextField} from "@mui/material";

interface Props {
	value: string
	onChange: Dispatch<string>,
	readonly?: boolean,
}

export function TextInput({value, onChange, readonly}: Props) {
	const onChange_ = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => onChange && onChange(e.target.value), [onChange]);
	return <TextField value={value} onChange={onChange_} disabled={readonly} aria-readonly={readonly} />;
}
