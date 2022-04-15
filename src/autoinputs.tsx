import React, {Dispatch, FC, PropsWithChildren, useCallback, useMemo, useState} from "react";
import {Either, joinLeftRight} from "./either";
export type AutoInputF<I, O> = (state: I, onChange: Dispatch<I>, defaultState: I, output: (i: I) => O) => React.ReactElement | null;

export const noop = () => null;
export const identity = (i: any) => i;

export function bindParams<P>(C: (p: P) => React.ReactElement | null, p: Partial<P>): (p: P) => React.ReactElement | null {
	return (pp: P) => <C {...{...pp, ...p}}/>
}

export class AutoInput<I, O> {
	constructor(public output: (i: I) => O, public defaultState: I, public render: AutoInputF<I, O>) {
	}

	withDefault(i: I) {
		return new AutoInput(this.output, i, this.render);
	}

	usingComponent(Input: FC<{value: I, onChange: Dispatch<I>}>): AutoInput<I, O> {
		return new AutoInput<I, O>(this.output, this.defaultState, (value, onChange) => <Input value={value} onChange={onChange}/>);
	}

	// usingComponentWithErr(Input: FC<{value: I, onChange: Dispatch<I>}>): AutoInput<I, O> {
	// 	return new AutoInput<I, O>(this.output, this.defaultState, (value, onChange) => <Input value={value} onChange={onChange}/>);
	// }

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

	static ident<I>(defaultState: I): AutoInput<I, I> {
		return new AutoInput<I, I>(i => i, defaultState, () => null);
	}

	static apply = apply;

	bind<I2, R>(f: (o: O) => AutoInput<I2, R>) {
		return bind<I, I2, O, R>(this, f);
	}

	static fromObj<Inputs extends Record<string, AutoInput<any, any>>>(inputs: Inputs) {
		return fromObj(inputs);
	}

	order<E>(values: E[]): I extends [E, E[]] ? AutoInput<E[], O[]> : never {
		return order(values, this as any) as any;
	}

	static renderWithErr<I, O>(ai: AutoInput<I, Either<O, string>>, Component: FC<{value: I, onChange: Dispatch<I>, error?: string}>): AutoInput<I, Either<O, string>> {
		return new AutoInput<I, Either<O, string>>(
			ai.output,
			ai.defaultState,
			(i, c) => joinLeftRight<O, string, React.ReactElement>(
					result => <Component value={i} onChange={c}/>,
					error => <Component value={i} onChange={c} error={error}/>
			)(ai.output(i))
		)
	}
}

function map<I, O, R>({render, output, defaultState}: AutoInput<I, O>, f: (t: O) => R): AutoInput<I, R> {
	return new AutoInput<I, R>((v: I) => f(output(v)), defaultState, (i, c, d) => render(i, c, d, output));
}


export function useAutoInput<I, O>(
	i: AutoInput<I, O>,
	callback: Dispatch<I> = noop,
	d = i.defaultState,
): [I, O, React.ReactElement | null] {
	const [value, setValue] = useState(() => d);
	const {render, output} = i;

	const result = useMemo(() => output(value), [output, value])
	const setAndCb = useCallback((v: I) => {
		setValue(() => v);
		callback(v)
	}, [callback]);

	const ele = useMemo(() => render(value, setAndCb, d, output), [d, output, render, setAndCb, value])
	return [value, result, ele];
}


function lift<I, V>(i: I, v: V): AutoInput<I, V> {
	return new AutoInput<I, V>(() => v, i, () => null);
}

function apply<I1, I2, P1, O>(input: AutoInput<I1, (p: P1) => O>, param: AutoInput<I2, P1>): AutoInput<[I1, I2], O> {
	return new AutoInput<[I1, I2], O>(([a, b]) => input.output(a)(param.output(b)), [input.defaultState, param.defaultState], ([a, b], onChange) => {
		return <>
			{input.render(a, (i1) => onChange && onChange([i1, b]), input.defaultState, input.output)}
			{param.render(b, (i2) => onChange && onChange([a, i2]), param.defaultState, param.output)}
		</>
	});
}

function applyNamed<K extends string, I1 extends Record<K, any>, I2, P1, O>(
	k: K,
	f: AutoInput<I1, (p: P1) => O>,
	p: AutoInput<I2, P1>
): AutoInput<I1, O> {
	return new AutoInput<I1, O>(v => f.output(v)(p.output(v[k])), {...f.defaultState, [k]: p.defaultState}, (value, onChange) => {
		const i = value[k];
		return <>
			{f.render(value, (i1: I1) => onChange && onChange({...i1, [k]: i}), f.defaultState, f.output)}
			{p.render(i, (i2: I2) => onChange && onChange({...value, [k]: i2}), p.defaultState, p.output)}
		</>
	})
}

function bind<I1, I2, P1, O>(p: AutoInput<I1, P1>, f: (p: P1) => AutoInput<I2, O>): AutoInput<[I1, I2], O> {
	return new AutoInput<[I1, I2], O>(
		v => f(p.output(v[0])).output(v[1]),
		[p.defaultState, f(p.output(p.defaultState)).defaultState] as [I1, I2],
		([a, b], onChange) => {
			const op = f(p.output(a));
			return <>
				{p.render(a, i1 => onChange && onChange([i1, b]), p.defaultState, p.output)}
				{op.render(b, i2 => onChange && onChange([a, i2]), op.defaultState, op.output)}
			</>
		}
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
	let Input = lift({} as ValueRecordFromAutoInputs<Inputs>, {} as RecordFromAutoInputs<Inputs>);
	keys.forEach(k => {
		Input = applyNamed(
			k,
			map(Input,(existing: RecordFromAutoInputs<Inputs>) => (nextValue: RecordFromAutoInputs<Inputs>) => ({...existing, [k]: nextValue}) ),
			map(inputs[k], v => ({[k]: v}) as RecordFromAutoInputs<Inputs>)
		);
	})

	return Input;
}

function order<I, O>(values: I[], selector: AutoInput<[I, I[]], O>): AutoInput<I[], O[]> {
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
				{selector.render(state, ([v]: [I, I[]]) =>
					onChange && onChange([...value.slice(0, i), v, ...value.slice(i + 1)]), selector.defaultState, selector.output)}
			</React.Fragment>
			)}
		</>
	}

	const output = function output(i: I[]): O[] {
		const reordered = reorder(i);
		return reordered.map(selector.output);
	}

	return new AutoInput<I[], O[]>(output, values, Ordering);
}
