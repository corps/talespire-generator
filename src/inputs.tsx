import React, {ChangeEvent, Dispatch, FC, useCallback, useEffect, useState} from "react";
import {MenuItem, Select, SelectChangeEvent, TextField} from "@mui/material";

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
	const onBlur = useCallback((e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => onChange && onChange(e.target.value), [onChange]);
	const [v, setValue] = useState(() => value);
	const onAnyChange = useCallback((e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => setValue(e.target.value), []);

	useEffect(() => {
		setValue(value)
	}, [value])



	return <TextField size="medium" sx={{m: 1, width: '45ch' }} margin="normal" value={v ? mask ? mask : v : v}
										multiline maxRows={1} onChange={onAnyChange} onBlur={onBlur} disabled={readonly} aria-readonly={readonly}
										error={!!error} helperText={error || helper} label={label} />;
}

export interface SelectInputProps {
	value: string
	options: string[]
	label?: string
	onChange?: Dispatch<string>,
}

export function SelectInput({label, value, options, onChange}: SelectInputProps) {
	const onChange_ = useCallback((e: SelectChangeEvent<string>) => onChange && onChange(e.target.value), [onChange]);
	return <Select label={label} value={value} size="medium" sx={{m: 1, width: '45ch'}} onChange={onChange_}>
		{options.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
	</Select>;
}


export function SelectInputWithOptions<O extends Record<string, any>>(obj: O): FC<{ value: keyof O, onChange: Dispatch<keyof O> }> {
	const options = Object.keys(obj);
	return function Select({value, onChange}) {
		return <SelectInput value={value as any} options={options} onChange={onChange as any}/>
	}
}
