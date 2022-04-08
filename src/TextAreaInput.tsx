import {AutoInput, ChangeParams, ValueParams} from "./autoinputs";
import React, {ChangeEvent, useCallback} from "react";
import {TextField} from "@mui/material";

export function TextAreaInput({value, onChange, readonly}: ChangeParams<string> & ValueParams<string> & { readonly?: boolean }) {
	const onChange_ = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => onChange && onChange(e.target.value), [onChange]);
	return <TextField value={value} onChange={onChange_} disabled={readonly} aria-readonly={readonly} />;
}

export const Text = new AutoInput((s: string) => s, "", TextAreaInput);
