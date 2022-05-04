import React, {Dispatch, FC, PropsWithChildren, useCallback, useMemo, useState} from "react";
import {Either, joinLeftRight} from "./either";
import {boolean} from "mathjs";
export type AutoInputF<I, O> = (state: I, onChange: Dispatch<I>) => React.ReactElement | null;

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

	wrappedWith(Wrapper: (p: PropsWithChildren<{}>) => React.ReactElement): AutoInput<I, O> {
		const {output, defaultState} = this;
		return new AutoInput<I, O>(output, defaultState, (...args) => <Wrapper>{this.render(...args)}</Wrapper>)
	}

	static or = or;

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

	bind<I2, R>(f: (o: O) => AutoInput<I, R>, bindBack: (i2: I2) => I) {
		return bind<I, O, I2, R>(this, f, bindBack);
	}

	static fromObj<Inputs extends Record<string, AutoInput<any, any>>>(inputs: Inputs) {
		return fromObj(inputs);
	}

	static several = several;

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
	return new AutoInput<I, R>((v: I) => f(output(v)), defaultState, render);
}


export function useAutoInput<I, O>(
	i: AutoInput<I, O>,
	callback: Dispatch<I> = noop,
	d = i.defaultState,
): [O, React.ReactElement | null] {
	const [value, setValue] = useState(() => d);
	const {render, output} = i;

	const result = useMemo(() => output(value), [output, value])
	const setAndCb = useCallback((v: I) => {
		setValue(() => v);
		callback(v)
	}, [callback]);

	const ele = useMemo(() => render(value, setAndCb), [render, setAndCb, value])
	return [result, ele];
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

// function withState<I1, I2, O>(input: AutoInput<I1, O>, stateDefault: I2): AutoInput<[I1, I2], O> {
// 	return new AutoInput<[I1, I2], O>(
// 		([])
// 	)
// }

function applyNamed<K extends string, I1 extends Record<K, any>, I2, P1, O>(
	k: K,
	f: AutoInput<I1, (p: P1) => O>,
	p: AutoInput<I2, P1>
): AutoInput<I1, O> {
	return new AutoInput<I1, O>(v => f.output(v)(p.output(v[k])), {...f.defaultState, [k]: p.defaultState}, (value, onChange) => {
		const i = value[k];
		return <>
			{f.render(value, (i1: I1) => onChange && onChange({...i1, [k]: i}))}
			{p.render(i, (i2: I2) => onChange && onChange({...value, [k]: i2}))}
		</>
	})
}

function Bind<I1, P1, I2, O>({f, output, state, onChange, children}: PropsWithChildren<{output: (i: I1) => P1, f: (p: P1, i: I1) => AutoInput<I2, O>, state: I1, onChange: Dispatch<I2>}>) {
	const o = useMemo(() => output(state), [output, state]);
	const op = useMemo(() => f(o, state), [f, o, state]);
	return <>
		<React.Fragment key="c">
			{children}
		</React.Fragment>
		<React.Fragment key="o">
			{op.render(op.defaultState, i2 => onChange && onChange(i2))}
		</React.Fragment>
	</>
}

function bind<I1, P1, I2, O>(p: AutoInput<I1, P1>, f: (p: P1, i: I1) => AutoInput<I2, O>, bindBack: (i2: I2) => I1): AutoInput<I1, O> {
	return new AutoInput<I1, O>(
		v => {
			const nextInput = f(p.output(v), v);
			return nextInput.output(nextInput.defaultState)
		},
		p.defaultState,
		(state, onChange) => {
			return <Bind output={p.output} f={f} onChange={v => onChange(bindBack(v))} state={state}>
				{p.render(state, i1 => onChange && onChange(i1))}
			</Bind>
		}
	);
}

type UnwrapAutoInput<T extends AutoInput<any, any>> = T extends AutoInput<any, infer V> ? V : unknown;
export type RecordFromAutoInputs<Inputs extends Record<string, AutoInput<any, any>>> = {
	[A in keyof Inputs]: UnwrapAutoInput<Inputs[A]>
}

type UnwrapAutoInputValue<T extends AutoInput<any, any>> = T extends AutoInput<infer V, any> ? V : unknown;
export type ValueRecordFromAutoInputs<Inputs extends Record<string, AutoInput<any, any>>> = {
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

function or<I1, I2, D, O>(a: AutoInput<I1, [D, O]>, b: AutoInput<I2, O>, takeB: (d: D) => boolean) {
	return apply(a.map(([ad, ao]) => (bo: O) => takeB(ad) ? [ad, bo] as [D, O] : [ad, ao] as [D, O]), b);
}

// function fromOptions<Result, Inputs extends Record<string, AutoInput<any, Result>>>(
// 	inputs: Inputs,
// 	optionSelector: AutoInput<keyof Inputs, keyof Inputs>,
// ) {
// 	return new AutoInput<[keyof Inputs, ValueRecordFromAutoInputs<Inputs>], Result>(
// 		([s, values]) => inputs[s].output(values[s]),
// 		inputs[optionSelector.output(optionSelector.defaultState)].defaultState,
// 		([s, values], onChange) => {
// 			const k = optionSelector.output(s);
// 			return <>
// 				{optionSelector.render(s, newS => onChange([newS, values]), optionSelector.defaultState, optionSelector.output)}
// 				{inputs[k].render(values[k], (newV => onChange([s, {...values, [k]: newV}])), inputs[k].defaultState, inputs[k].output)}
// 			</>;
// 		},
// 	);
// }

function several<I, O>(input: AutoInput<I, O>, validate: (i: I) => boolean): AutoInput<I[], O[]> {
	return new AutoInput<I[], O[]>(
		is => is.filter(validate).map(input.output),
		[],
		(state, onChange) => {
			return <>
				{state.map((s, i) => <React.Fragment key={i}>
					{input.render(s, v => onChange([...state.slice(0, i), v, ...state.slice(i + 1)].filter(validate)))}
				</React.Fragment>)}
			</>
		}
	)
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
					onChange && onChange([...value.slice(0, i), v, ...value.slice(i + 1)]))}
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
