import React, {ChangeEvent, Dispatch, useCallback} from "react";
import {TextField} from "@mui/material";

export interface TextInputProps {
	value: string
	onChange?: Dispatch<string>,
	readonly?: boolean,
	error?: string
	label?: string
	helper?: string
	mask?: string
}

export function TextInput({value, onChange, readonly, error, label, helper, mask}: TextInputProps) {
	const onChange_ = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => onChange && onChange(e.target.value), [onChange]);
	return <TextField size="medium" sx={{m: 1, width: '45ch' }} margin="normal" value={value ? mask ? mask : value : value}
										multiline maxRows={5} onChange={onChange_} disabled={readonly} aria-readonly={readonly}
										error={!!error} helperText={error || helper} label={label} />;
}
