import React, {Dispatch, useCallback, useEffect, useMemo, useState} from "react";

export type ChangeParams<T> = { onChange: (t: T) => void };
export type ValueParams<T> = { value: T };
export type AutoC<I, O> = (p: ChangeParams<I> & ValueParams<I>) => React.ReactElement | null;
export interface AutoInput<I, O> {
	(p: ChangeParams<I> & ValueParams<I>): React.ReactElement | null;
	output: (i: I) => O;
	defaultState: I,
}

interface ICallableInstance {
	// prettier-ignore
	new <Args extends unknown[], Return>(property: string): (...argv: Args) => Return;
	constructor <Args extends unknown[], Return>(property: string): (...argv: Args) => Return;
}
function CallableInstanceF(this: any, property: string) {
	var func = this.constructor.prototype[property];
	var apply = function() { return func.apply(apply, arguments); }
	Object.setPrototypeOf(apply, this.constructor.prototype);
	Object.getOwnPropertyNames(func).forEach(function (p) {
		const pd = Object.getOwnPropertyDescriptor(func, p);
		if (!pd) {
			throw new Error(`${p} is not a property!`);
		}
		Object.defineProperty(apply, p,  pd);
	});
	return apply;
}
CallableInstanceF.prototype = Object.create(Function.prototype);
// @ts-ignore
const CallableInstance: ICallableInstance = CallableInstanceF;

// type UnwrapArgs<T> = T extends (p: infer P) => infer O ? [P, ...UnwrapArgs<O>] : [];
// type UnwrapAutoInputArgs<T> = T extends (p: infer P) => infer O ? [AutoInput<any, P>, ...UnwrapAutoInputArgs<O>] : [];
// type UnwrapAutoInputValues<Z, P extends any[]> = P extends [AutoInput<infer Head, any>, ...infer Tail] ?
// 	UnwrapAutoInputValues<[Z, Head], Tail> : Z;


type UnwrapReturn<T> = T extends (p: any) => infer O ? UnwrapReturn<O> : T;

export class AutoInput<I, O> extends CallableInstance<[ChangeParams<I> & ValueParams<I>], React.ReactElement | null> {
	constructor(public output: (i: I) => O, public defaultState: I, public Input: AutoC<I, O>) {
		super('Input');
	}

	map<R>(f: (t: O) => R): AutoInput<I, R> {
		return map(this, f);
	}

	static lift<I, V>(i: I, v: V): AutoInput<I, V> {
		return lift(i ,v);
	}


	static apply = apply;

	bind<I2, R>(f: (o: O) => AutoInput<I2, R>) {
		return bind(this, f);
	}

	static fromObj<Inputs extends Record<string, AutoInput<any, any>>>(inputs: Inputs) {
		return fromObj(inputs);
	}

	order<E>(values: E[]): I extends [E, E[]] ? AutoInput<E[], O[]> : never {
		return order(values, this as any) as any;
	}
}


function map<I, O, R>({Input, output, defaultState}: AutoInput<I, O>, f: (t: O) => R): AutoInput<I, R> {
	function Mapped({value, onChange}: ChangeParams<I> & ValueParams<I>) {
		return <Input value={value} onChange={onChange}/>
	}

	return new AutoInput<I, R>((v: I) => f(output(v)), defaultState, Mapped);
}

export function useAutoInput<I, O>(Input: AutoInput<I, O>, callback: Dispatch<O>): [I, O, React.ReactElement | null] {
	const [value, setValue] = useState(Input.defaultState);

	const setAndCb = useCallback((v: I) => {
		setValue(() => v);
		callback(Input.output(v))
	}, [Input, callback]);

	return [value, Input.output(value), <Input value={value} onChange={setAndCb}/>];
}

function lift<I, V>(i: I, v: V): AutoInput<I, V> {
	function Value({value, onChange}: ChangeParams<I> & ValueParams<I>) {
		useEffect(() => onChange(i), [onChange])
		return null;
	}

	return new AutoInput<I, V>(() => v, i, Value);
}

function apply<I1, I2, P1, O>(Input: AutoInput<I1, (p: P1) => O>, Param: AutoInput<I2, P1>): AutoInput<[I1, I2], O> {
	function Applied({onChange, value}: ChangeParams<[I1, I2]> & ValueParams<[I1, I2]>) {
		const setLastF = useCallback((i1: I1) => onChange(
			[i1, value[1]]
		), [onChange, value]);

		const setLastP = useCallback((i2: I2) => onChange(
			[value[0], i2]
		), [onChange, value]);

		return <>
			<Input onChange={setLastF} value={value[0]}/>
			<Param onChange={setLastP} value={value[1]}/>
		</>
	}

	const output = function output([a, b]: [I1, I2]): O {
		return Input.output(a)(Param.output(b));
	}
	const defaultState = [Input.defaultState, Param.defaultState] as [I1, I2];

	return new AutoInput<[I1, I2], O>(output, defaultState, Applied);
}

function applyNamed<K extends string, I1 extends Record<K, any>, I2, P1, O>(k: K, Input: AutoInput<I1, (p: P1) => O>, Param: AutoInput<I2, P1>): AutoInput<I1, O> {
	function Applied({onChange, value}: ChangeParams<I1> & ValueParams<I1>) {
		const setLastF = useCallback((i1: I1) => onChange({...i1, [k]: value[k]}), [onChange, value]);
		const setLastP = useCallback((i2: I2) => onChange({...value, [k]: i2}), [onChange, value]);

		return <>
			<Input onChange={setLastF} value={value}/>
			<Param onChange={setLastP} value={value[k]}/>
		</>
	}

	const output = function output(v: I1): O {
		return Input.output(v)(Param.output(v[k]));
	}

	const defaultState = {...Input.defaultState, [k]: Param.defaultState};

	return new AutoInput<I1, O>(output, defaultState, Applied);
}

function bind<I1, I2, P1, O>(Param: AutoInput<I1, P1>, f: (p: P1) => AutoInput<I2, O>): AutoInput<[I1, I2], O> {
	function Bound({onChange, value: [a, b]}: ChangeParams<[I1, I2]> & ValueParams<[I1, I2]>) {
		const setLastP = useCallback((i1: I1) => onChange(
			[i1, b]
		), [onChange, b]);

		const setLastF = useCallback((i2: I2) => onChange(
			[a, i2]
		), [a, onChange]);

		const Op = f(Param.output(a));

		return <>
			<Param onChange={setLastP} value={a}/>
			<Op onChange={setLastF} value={b}/>
		</>
	}

	const output = function output(v: [I1, I2]): O {
		return f(Param.output(v[0])).output(v[1]);
	}

	const defaultState = [Param.defaultState, f(Param.output(Param.defaultState)).defaultState] as [I1, I2];

	return new AutoInput<[I1, I2], O>(output, defaultState, Bound);
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

	function Ordering({value, onChange}: ValueParams<I[]> & ChangeParams<I[]>) {
		const reordered = useMemo(() => reorder(value), [value]);
		const onChanges = useMemo(() => values.map((_, i) => ([v]: [I, I[]]) => onChange([...value.slice(0, i), v, ...value.slice(i + 1)])), [value, onChange]);
		return <>{reordered.map((state, i) => <Selector key={i} onChange={onChanges[i]} value={state}/>)}</>
	}

	const output = function output(i: I[]): O[] {
		const reordered = reorder(i);
		return reordered.map(Selector.output);
	}

	return new AutoInput<I[], O[]>(output, values, Ordering);
}
