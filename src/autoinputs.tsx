import React, {Dispatch, FC, PropsWithChildren, useCallback, useMemo, useState} from "react";
import {Either, joinLeftRight} from "./either";

export type FCWithValue<T> = FC<{value: T}>
export type FCWithOnChange<T> = FC<{value: T, onChange?: Dispatch<T>, error?: string}>
export type AutoInputF<I> = (state: I, onChange: Dispatch<I>) => React.ReactElement | null;

export const noop = () => null;
export const identity = (i: any) => i;

export function bindParams<P>(C: FC<P>, p: Partial<P>): FC<P> {
	return (pp: P) => <C {...{...pp, ...p}}/>
}

export class AutoInput<I, O> {
	constructor(public output: (i: I) => O, public defaultState: I, public render: AutoInputF<I>) {
	}

	withDefault(i: I) {
		return new AutoInput(this.output, i, this.render);
	}

	usingComponent(Input: FC<{value: I, onChange: Dispatch<I>}>): AutoInput<I, O> {
		return new AutoInput<I, O>(this.output, this.defaultState, (value, onChange) => <Input value={value} onChange={onChange}/>);
	}

	wrappedWith(Wrapper: (p: PropsWithChildren<{}>) => React.ReactElement): AutoInput<I, O> {
		const {output, defaultState} = this;
		return new AutoInput<I, O>(output, defaultState, (...args) => <Wrapper>{this.render(...args)}</Wrapper>)
	}

	static fromComponent<I>(Component: FC<{value: I, onChange: Dispatch<I>}>, d: I): AutoInput<I, I> {
		return new AutoInput<I, I>(identity, d, (value, onChange) => <Component value={value} onChange={onChange}/>)
	}

	map<R>(f: (t: O) => R): AutoInput<I, R> {
		return map(this, f);
	}

	static lift<I, V>(i: I, v: V): AutoInput<I, V> {
		return lift(i ,v);
	}

	static apply = apply;

	static withError = withError;

	bind<I2, R>(f: (o: O) => AutoInput<I2, R>) {
		return bind<I, I2, O, R>(this, f);
	}

	static fromObj<Inputs extends Record<string, AutoInput<any, any>>>(inputs: Inputs) {
		return fromObj(inputs);
	}

	order<E>(values: E[]): I extends [E, E[]] ? AutoInput<E[], O[]> : never {
		return order(values, this as any) as any;
	}
}

function map<I, O, R>({render, output, defaultState}: AutoInput<I, O>, f: (t: O) => R): AutoInput<I, R> {
	return new AutoInput<I, R>((v: I) => f(output(v)), defaultState, render);
}


export function useAutoInput<I, O>(
	Input: AutoInput<I, O>,
	callback: Dispatch<O> = noop,
	d = Input.defaultState,
): [I, O, React.ReactElement | null] {
	const [value, setValue] = useState(() => d);

	const setAndCb = useCallback((v: I) => {
		setValue(() => v);
		callback(Input.output(v))
	}, [Input, callback]);

	const result = useMemo(() => Input.output(value), [Input, value])
	const ele = useMemo(() => Input.render(value, setAndCb), [Input, setAndCb, value])
	return [value, result, ele];
}


function lift<I, V>(i: I, v: V): AutoInput<I, V> {
	return new AutoInput<I, V>(() => v, i, () => null);
}

function apply<I1, I2, P1, O>(input: AutoInput<I1, (p: P1) => O>, param: AutoInput<I2, P1>): AutoInput<[I1, I2], O> {
	return new AutoInput<[I1, I2], O>(([a, b]) => input.output(a)(param.output(b)), [input.defaultState, param.defaultState], ([a, b], onChange) => {
		return <>
			{input.render(a, (i1) => onChange && onChange([i1, b]))}
			{param.render(b, (i2) => onChange && onChange([a, i2]))}
		</>
	});
}

function applyNamed<K extends string, I1 extends Record<K, any>, I2, P1, O>(
	k: K,
	Input: AutoInput<I1, (p: P1) => O>,
	Param: AutoInput<I2, P1>
): AutoInput<I1, O> {
	return new AutoInput<I1, O>(v => Input.output(v)(Param.output(v[k])), {...Input.defaultState, [k]: Param.defaultState}, (value, onChange) => {
		const i = value[k];
		return <>
			{Input.render(value, (i1: I1) => onChange && onChange({...i1, [k]: i}))}
			{Param.render(i, (i2: I2) => onChange && onChange({...value, [k]: i2}))}
		</>
	})
}

function bind<I1, I2, P1, O>(Param: AutoInput<I1, P1>, f: (p: P1) => AutoInput<I2, O>): AutoInput<[I1, I2], O> {
	return new AutoInput<[I1, I2], O>(
		v => f(Param.output(v[0])).output(v[1]),
		[Param.defaultState, f(Param.output(Param.defaultState)).defaultState] as [I1, I2],
		([a, b], onChange) => <>
			{Param.render(a, i1 => onChange && onChange([i1, b]))}
			{f(Param.output(a)).render(b, i2 => onChange && onChange([a, i2]))}
		</>
	);
}

type UnwrapAutoInput<T extends AutoInput<any, any>> = T extends AutoInput<any, infer V> ? V : unknown;
type RecordFromAutoInputs<Inputs extends Record<string, AutoInput<any, any>>> = {
	[A in keyof Inputs]: UnwrapAutoInput<Inputs[A]>
}

type UnwrapAutoInputValue<T extends AutoInput<any, any>> = T extends AutoInput<infer V, any> ? V : unknown;
type ValueRecordFromAutoInputs<Inputs extends Record<string, AutoInput<any, any>>> = {
	[A in keyof Inputs]: UnwrapAutoInputValue<Inputs[A]>
}

function fromObj<Inputs extends Record<string, AutoInput<any, any>>>(inputs: Inputs): AutoInput<ValueRecordFromAutoInputs<Inputs>, RecordFromAutoInputs<Inputs>> {
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

function order<I, O>(values: I[], Selector: AutoInput<[I, I[]], O>): AutoInput<I[], O[]> {
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

	function Ordering(value: I[], onChange: Dispatch<I[]>) {
		const reordered = reorder(value);
		return <>
			{reordered.map((state, i) => <React.Fragment key={i}>
				{Selector.render(state, ([v]: [I, I[]]) =>
					onChange && onChange([...value.slice(0, i), v, ...value.slice(i + 1)])}
			</React.Fragment>
			)}
		</>
	}

	const output = function output(i: I[]): O[] {
		const reordered = reorder(i);
		return reordered.map(Selector.output);
	}

	return new AutoInput<I[], O[]>(output, values, Ordering);
}

function withError<I, O>(left: AutoInput<I, Either<O, string>>, d: O): AutoInput<[I, null], O> {
	return left.bind<null, O>(
		(v: Either<O, string>) => joinLeftRight(v,
			(v: O) => lift(null, v),
			err => lift(null, d).wrappedWith(() => <Alert severity="warning">{err}</Alert>)))
}
