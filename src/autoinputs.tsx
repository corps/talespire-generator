import React, {Dispatch, useCallback, useEffect, useMemo, useState} from "react";

export type ChangeParams<T> = { onChange: (t: T) => void };
export type ValueParams<T> = { value: T };
export type AutoC<I, O> = (p: ChangeParams<I> & ValueParams<I>) => React.ReactElement | null;
export interface AutoInput<I, O> {
	(p: ChangeParams<I> & ValueParams<I>): React.ReactElement | null;
	output: (i: I) => O;
	defaultState: I,
}

export function useAutoInput<I, O>(Input: AutoInput<I, O>, callback: Dispatch<O>): [I, O, React.ReactElement | null] {
	const [value, setValue] = useState(Input.defaultState);

	const setAndCb = useCallback((v: I) => {
		setValue(() => v);
		callback(Input.output(v))
	}, [Input.output, callback]);

	return [value, Input.output(value), <Input value={value} onChange={setAndCb}/>];
}

export function map<I, O, R>(Input: AutoInput<I, O>, f: (t: O) => R): AutoInput<I, R> {
	function Mapped(p: ChangeParams<I> & ValueParams<I>) {
		return <Input value={p.value} onChange={p.onChange}/>
	}

	Mapped.output = function (v: I): R { return f(Input.output(v)); }
	Mapped.defaultState = Input.defaultState;

	return Mapped;
}

export function lift<I, V>(i: I, v: V): AutoInput<I, V> {
	function Value(p: ChangeParams<I> & ValueParams<I>) {
		useEffect(() => p.onChange(i), [p.onChange])
		return null;
	}

	Value.output = () => v;
	Value.defaultState = i;

	return Value;
}

export function apply<I1, I2, P1, O>(Input: AutoInput<I1, (p: P1) => O>, Param: AutoInput<I2, P1>): AutoInput<[I1, I2], O> {
	function Applied(p: ChangeParams<[I1, I2]> & ValueParams<[I1, I2]>) {
		const setLastF = useCallback((i1: I1) => p.onChange(
			[i1, p.value[1]]
		), [p.onChange, p.value]);

		const setLastP = useCallback((i2: I2) => p.onChange(
			[p.value[0], i2]
		), [p.onChange, p.value]);

		return <>
			<Input onChange={setLastF} value={p.value[0]}/>
			<Param onChange={setLastP} value={p.value[1]}/>
		</>
	}

	Applied.output = function output([a, b]: [I1, I2]): O {
		return Input.output(a)(Param.output(b));
	}
	Applied.defaultState = [Input.defaultState, Param.defaultState] as [I1, I2];

	return Applied;
}

export function applyNamed<K extends string, I1 extends Record<K, any>, I2, P1, O>(k: K, Input: AutoInput<I1, (p: P1) => O>, Param: AutoInput<I2, P1>): AutoInput<I1, O> {
	function Applied(p: ChangeParams<I1> & ValueParams<I1>) {
		const setLastF = useCallback((i1: I1) => p.onChange({...i1, [k]: p.value[k]}), [p.onChange, p.value]);
		const setLastP = useCallback((i2: I2) => p.onChange({...p.value, [k]: i2}), [p.onChange, p.value]);

		return <>
			<Input onChange={setLastF} value={p.value}/>
			<Param onChange={setLastP} value={p.value[k]}/>
		</>
	}

	Applied.output = function output(v: I1): O {
		return Input.output(v)(Param.output(v[k]));
	}

	Applied.defaultState = {...Input.defaultState, [k]: Param.defaultState};

	return Applied;
}

export function bind<I1, I2, P1, O>(Param: AutoInput<I1, P1>, f: (p: P1) => AutoInput<I2, O>): AutoInput<[I1, I2], O> {
	function Bound(p: ChangeParams<[I1, I2]> & ValueParams<[I1, I2]>) {
		const setLastP = useCallback((i1: I1) => p.onChange(
			[i1, p.value[1]]
		), [p.onChange, p.value]);

		const setLastF = useCallback((i2: I2) => p.onChange(
			[p.value[0], i2]
		), [p.onChange, p.value]);

		const Op = f(Param.output(p.value[0]));

		return <>
			<Param onChange={setLastP} value={p.value[0]}/>
			<Op onChange={setLastF} value={p.value[1]}/>
		</>
	}

	Bound.output = function output(v: [I1, I2]): O {
		return f(Param.output(v[0])).output(v[1]);
	}

	Bound.defaultState = [Param.defaultState, f(Param.output(Param.defaultState)).defaultState] as [I1, I2];

	return Bound;
}

type UnwrapAutoInput<T extends AutoInput<any, any>> = T extends AutoInput<any, infer V> ? V : unknown;
type RecordFromAutoInputs<Inputs extends Record<string, AutoInput<any, any>>> = {
	[A in keyof Inputs]: UnwrapAutoInput<Inputs[A]>
}

type UnwrapAutoInputValue<T extends AutoInput<any, any>> = T extends AutoInput<infer V, any> ? V : unknown;
type ValueRecordFromAutoInputs<Inputs extends Record<string, AutoInput<any, any>>> = {
	[A in keyof Inputs]: UnwrapAutoInputValue<Inputs[A]>
}

export function fromObj<Inputs extends Record<string, AutoInput<any, any>>>(inputs: Inputs): AutoInput<ValueRecordFromAutoInputs<Inputs>, RecordFromAutoInputs<Inputs>> {
	const keys = Object.keys(inputs);
	let Input = lift({} as ValueRecordFromAutoInputs<Inputs>, {}) as AutoInput<ValueRecordFromAutoInputs<Inputs>, RecordFromAutoInputs<Inputs>>;
	keys.forEach(k => {
		Input = applyNamed(
			k,
			map(Input,(existing: RecordFromAutoInputs<Inputs>) => (nextValue: RecordFromAutoInputs<Inputs>) => ({...existing, [k]: nextValue}) ),
			map(inputs[k], v => ({[k]: v}) as RecordFromAutoInputs<Inputs>)
		);
	})

	return Input;
}


export function wrapAuto<I, O>(Input: AutoC<I, O>, output: (i: I) => O, defaultState: I): AutoInput<I, O> {
	function Wrapped(p: ValueParams<I> & ChangeParams<I>) {
		return <Input value={p.value} onChange={p.onChange} />
	}

	Wrapped.output = output;
	Wrapped.defaultState = defaultState;

	return Wrapped;
}

export function order<I, O>(values: I[], Selector: AutoInput<[I, I[]], O>): AutoInput<I[], O[]> {
	function reorder(is: I[]): [I, I[]][] {
		let available = values;
		const result: [I, I[]][] = [];

		is.forEach(n => {
			let availableIdx = available.indexOf(n);
			availableIdx = availableIdx === -1 ? 0 : availableIdx;
			result.push([available[availableIdx], available]);
			available = [...available];
			available.splice(availableIdx, 1);
		})

		return result;
	}

	function Ordering(p: ValueParams<I[]> & ChangeParams<I[]>) {
		const reordered = useMemo(() => reorder(p.value), [p.value]);
		const onChanges = useMemo(() => values.map((_, i) => ([v]: [I, I[]]) => p.onChange([...p.value.slice(0, i), v, ...p.value.slice(i + 1)])), [p.value, p.onChange]);
		return <>{reordered.map((state, i) => <Selector key={i} onChange={onChanges[i]} value={state}/>)}</>
	}

	Ordering.output = function output(i: I[]): O[] {
		const reordered = reorder(i);
		return reordered.map(Selector.output);
	}

	Ordering.defaultState = values;

	return Ordering;
}
