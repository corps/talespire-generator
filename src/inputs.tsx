import React, {ChangeEvent, Dispatch, useCallback} from "react";
import {TextField} from "@mui/material";

interface Props {
	value: string
	onChange: Dispatch<string>,
	readonly?: boolean,
	error?: string
	label?: string
}

export function TextInput({value, onChange, readonly, error, label}: Props) {
	const onChange_ = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => onChange && onChange(e.target.value), [onChange]);
	return <TextField size="medium" sx={{m: 1, width: '45ch' }} margin="normal" value={value}
										multiline maxRows={5} onChange={onChange_} disabled={readonly} aria-readonly={readonly}
										error={!!error} helperText={error} label={label} />;
}
