import React, {Dispatch, FC} from "react";
import {AutoMemo, useAutoMemo} from "./automemo";
import {Either, joinLeftRight} from "./either";

export type FCWithValue<T> = FC<{value: T}>
export type FCWithOnChange<T> = FC<{value: T, onChange: Dispatch<T>, error?: string}>

export function bindParams<P>(C: FC<P>, p: Partial<P>): FC<P> {
	return (pp: P) => <C {...{...pp, ...p}}/>
}

export function useBoundInput<V>(F: FCWithOnChange<V>, value: V, onChange: Dispatch<V>): [React.ReactElement | null, V, Dispatch<V>, undefined];
export function useBoundInput<V, O>(F: FCWithOnChange<V>, value: V, onChange: Dispatch<V>, memo: AutoMemo<V, Either<O, string>>): [React.ReactElement | null, V, Dispatch<V>, Either<O, string>];
export function useBoundInput<V, O=unknown>(F: FCWithOnChange<V>, value: V, onChange: Dispatch<V>, memo?: AutoMemo<V, Either<O, string>>): [React.ReactElement | null, V, Dispatch<V>, Either<O, string> | undefined] {
	let result: any;
	let error: string | undefined = undefined;
	if (memo) {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		let result = useAutoMemo(memo, value)
		error = joinLeftRight<O, string, string | undefined>(_ => undefined, error => error)(result);
	}

	return [<F value={value} onChange={onChange} error={error}/>, value, onChange, result];
}

export function bindValueWithError<V>(F: FCWithOnChange<V>, value: V, onChange: Dispatch<V>): [React.ReactElement | null, V, Dispatch<V>] {
	return [<F value={value} onChange={onChange}/>, value, onChange];
}

// export function useAutoInput()

// export function bindMemo()


// import {Either, joinLeftRight} from "./either";
// import {Alert} from "@mui/material";
//
// export type ChangeParams<T> = { onChange?: (t: T) => void };
// export type ValueParams<T> = { value: T };
// export interface AutoInput<I, O> {
// 	(p: ChangeParams<I> & ValueParams<I>): React.ReactElement | null;
// 	output: (i: I) => O;
// 	defaultState: I,
// }
//
// interface ICallableInstance {
// 	// prettier-ignore
// 	new <Args extends unknown[], Return>(property: string): (...argv: Args) => Return;
// 	constructor <Args extends unknown[], Return>(property: string): (...argv: Args) => Return;
// }
// function CallableInstanceF(this: any, property: string) {
// 	var func = this.constructor.prototype[property];
// 	var apply = function() { return func.apply(apply, arguments); }
// 	Object.setPrototypeOf(apply, this.constructor.prototype);
// 	Object.getOwnPropertyNames(func).forEach(function (p) {
// 		const pd = Object.getOwnPropertyDescriptor(func, p);
// 		if (!pd) {
// 			throw new Error(`${p} is not a property!`);
// 		}
// 		Object.defineProperty(apply, p,  pd);
// 	});
// 	return apply;
// }
// CallableInstanceF.prototype = Object.create(Function.prototype);
// // @ts-ignore
// const CallableInstance: ICallableInstance = CallableInstanceF;
//
//
// type UnwrapReturn<T> = T extends (p: any) => infer O ? UnwrapReturn<O> : T;
//
// export class AutoInput<I, O> extends CallableInstance<[ChangeParams<I> & ValueParams<I>], React.ReactElement | null> {
// 	constructor(public output: (i: I) => O, public defaultState: I, public Input: VFC<ValueParams<I> & ChangeParams<I>>) {
// 		super('runInput');
// 	}
//
// 	runInput(...args: any[]) {
// 		return (this.Input as any)(...args);
// 	}
//
// 	withDefault(i: I) {
// 		return new AutoInput(this.output, i, this.Input);
// 	}
//
// 	usingInput<P extends ChangeParams<I> & ValueParams<I>>(Input: VFC<P>, p: Omit<Omit<P, 'value'>, 'onChange'>): AutoInput<I, O> {
// 		return new AutoInput<I, O>(this.output, this.defaultState, ({value, onChange}) => Input({...p, onChange, value} as any));
// 	}
//
// 	wrappedWith(Wrapper: FC<{}>): AutoInput<I, O> {
// 		const {output, defaultState, Input} = this;
// 		return new AutoInput<I, O>(output, defaultState, ({value, onChange}) => <Wrapper><Input value={value} onChange={onChange}/></Wrapper>)
// 	}
//
// 	map<R>(f: (t: O) => R): AutoInput<I, R> {
// 		return map(this, f);
// 	}
//
// 	static lift<I, V>(i: I, v: V): AutoInput<I, V> {
// 		return lift(i ,v);
// 	}
//
// 	static apply = apply;
//
// 	static withError = withError;
//
// 	bind<I2, R>(f: (o: O) => AutoInput<I2, R>) {
// 		return bind<I, I2, O, R>(this, f);
// 	}
//
// 	static fromObj<Inputs extends Record<string, AutoInput<any, any>>>(inputs: Inputs) {
// 		return fromObj(inputs);
// 	}
//
// 	order<E>(values: E[]): I extends [E, E[]] ? AutoInput<E[], O[]> : never {
// 		return order(values, this as any) as any;
// 	}
// }
//
// function map<I, O, R>({Input, output, defaultState}: AutoInput<I, O>, f: (t: O) => R): AutoInput<I, R> {
// 	return new AutoInput<I, R>((v: I) => f(output(v)), defaultState, Input);
// }
//
// const noop = () => null;
//
// export function useAutoInput<I, O>(
// 	Input: AutoInput<I, O>,
// 	callback: Dispatch<O> = noop,
// 	d = Input.defaultState,
// ): [I, O, React.ReactElement | null] {
// 	const [value, setValue] = useState(() => d);
//
// 	const setAndCb = useCallback((v: I) => {
// 		setValue(() => v);
// 		callback(Input.output(v))
// 	}, [Input, callback]);
//
// 	const result = useMemo(() => Input.output(value), [Input, value])
// 	const ele = useMemo(() => <Input value={value} onChange={setAndCb}/>, [Input, setAndCb, value])
// 	return [value, result, ele];
// }
//
// function Lift() {
// 	return null;
// }
//
// function lift<I, V>(i: I, v: V): AutoInput<I, V> {
// 	return new AutoInput<I, V>(() => v, i, Lift);
// }
//
// function apply<I1, I2, P1, O>(Input: AutoInput<I1, (p: P1) => O>, Param: AutoInput<I2, P1>): AutoInput<[I1, I2], O> {
// 	function Applied({onChange, value: [a, b]}: ChangeParams<[I1, I2]> & ValueParams<[I1, I2]>) {
// 		const setLastF = useCallback((i1: I1) => onChange && onChange(
// 			[i1, b]
// 		), [onChange, b]);
//
// 		const setLastP = useCallback((i2: I2) => onChange && onChange(
// 			[a, i2]
// 		), [onChange, a]);
//
// 		return <>
// 			<Input onChange={setLastF} value={a}/>
// 			<Param onChange={setLastP} value={b}/>
// 		</>
// 	}
//
// 	const output = function output([a, b]: [I1, I2]): O {
// 		return Input.output(a)(Param.output(b));
// 	}
// 	const defaultState = [Input.defaultState, Param.defaultState] as [I1, I2];
//
// 	return new AutoInput<[I1, I2], O>(output, defaultState, Applied);
// }
//
// function applyNamed<K extends string, I1 extends Record<K, any>, I2, P1, O>(k: K, Input: AutoInput<I1, (p: P1) => O>, Param: AutoInput<I2, P1>): AutoInput<I1, O> {
// 	function Applied({onChange, value}: ChangeParams<I1> & ValueParams<I1>) {
// 		const i = value[k];
// 		const setLastF = useCallback((i1: I1) => onChange && onChange({...i1, [k]: i}), [onChange, i]);
// 		const setLastP = useCallback((i2: I2) => onChange && onChange({...value, [k]: i2}), [onChange, value]);
//
// 		return <>
// 			<Input onChange={setLastF} value={value}/>
// 			<Param onChange={setLastP} value={i}/>
// 		</>
// 	}
//
// 	const output = function output(v: I1): O {
// 		return Input.output(v)(Param.output(v[k]));
// 	}
//
// 	const defaultState = {...Input.defaultState, [k]: Param.defaultState};
//
// 	return new AutoInput<I1, O>(output, defaultState, Applied);
// }
//
// function bind<I1, I2, P1, O>(Param: AutoInput<I1, P1>, f: (p: P1) => AutoInput<I2, O>): AutoInput<[I1, I2], O> {
// 	function Bound({onChange, value: [a, b]}: ChangeParams<[I1, I2]> & ValueParams<[I1, I2]>) {
// 		const [Op, setOp] = useState(() => f(Param.output(a)))
// 		const setLastP = useCallback((i1: I1) => {
// 			const newOp = f(Param.output(i1))
// 			setOp(newOp);
// 			onChange && onChange([i1, newOp.defaultState])
// 		}, [onChange]);
//
// 		const setLastF = useCallback((i2: I2) => {
// 			onChange && onChange([a, i2])
// 		}, [a, onChange]);
//
// 		return <>
// 			<Param onChange={setLastP} value={a}/>
// 			<Op onChange={setLastF} value={b}/>
// 		</>
// 	}
//
// 	const output = function output(v: [I1, I2]): O {
// 		return f(Param.output(v[0])).output(v[1]);
// 	}
//
// 	const defaultState = [Param.defaultState, f(Param.output(Param.defaultState)).defaultState] as [I1, I2];
//
// 	return new AutoInput<[I1, I2], O>(output, defaultState, Bound);
// }
//
// type UnwrapAutoInput<T extends AutoInput<any, any>> = T extends AutoInput<any, infer V> ? V : unknown;
// type RecordFromAutoInputs<Inputs extends Record<string, AutoInput<any, any>>> = {
// 	[A in keyof Inputs]: UnwrapAutoInput<Inputs[A]>
// }
//
// type UnwrapAutoInputValue<T extends AutoInput<any, any>> = T extends AutoInput<infer V, any> ? V : unknown;
// type ValueRecordFromAutoInputs<Inputs extends Record<string, AutoInput<any, any>>> = {
// 	[A in keyof Inputs]: UnwrapAutoInputValue<Inputs[A]>
// }
//
// function fromObj<Inputs extends Record<string, AutoInput<any, any>>>(inputs: Inputs): AutoInput<ValueRecordFromAutoInputs<Inputs>, RecordFromAutoInputs<Inputs>> {
// 	const keys = Object.keys(inputs);
// 	let Input = lift({} as ValueRecordFromAutoInputs<Inputs>, {}) as AutoInput<ValueRecordFromAutoInputs<Inputs>, RecordFromAutoInputs<Inputs>>;
// 	keys.forEach(k => {
// 		Input = applyNamed(
// 			k,
// 			map(Input,(existing: RecordFromAutoInputs<Inputs>) => (nextValue: RecordFromAutoInputs<Inputs>) => ({...existing, [k]: nextValue}) ),
// 			map(inputs[k], v => ({[k]: v}) as RecordFromAutoInputs<Inputs>)
// 		);
// 	})
//
// 	return Input;
// }
//
//
// function order<I, O>(values: I[], Selector: AutoInput<[I, I[]], O>): AutoInput<I[], O[]> {
// 	function reorder(is: I[]): [I, I[]][] {
// 		let available = values;
// 		const result: [I, I[]][] = [];
//
// 		is.forEach(n => {
// 			let availableIdx = available.indexOf(n);
// 			availableIdx = availableIdx === -1 ? 0 : availableIdx;
// 			result.push([available[availableIdx], available]);
// 			available = [...available];
// 			available.splice(availableIdx, 1);
// 		})
//
// 		return result;
// 	}
//
// 	function Ordering({value, onChange}: ValueParams<I[]> & ChangeParams<I[]>) {
// 		const reordered = useMemo(() => reorder(value), [value]);
// 		const onChanges = useMemo(() => values.map((_, i) => ([v]: [I, I[]]) => onChange && onChange([...value.slice(0, i), v, ...value.slice(i + 1)])), [value, onChange]);
// 		return <>{reordered.map((state, i) => <Selector key={i} onChange={onChanges[i]} value={state}/>)}</>
// 	}
//
// 	const output = function output(i: I[]): O[] {
// 		const reordered = reorder(i);
// 		return reordered.map(Selector.output);
// 	}
//
// 	return new AutoInput<I[], O[]>(output, values, Ordering);
// }
//
// function withError<I, O>(left: AutoInput<I, Either<O, string>>, d: O): AutoInput<[I, null], O> {
// 	return left.bind<null, O>(
// 		(v: Either<O, string>) => joinLeftRight(v,
// 			(v: O) => lift(null, v),
// 			err => lift(null, d).wrappedWith(() => <Alert severity="warning">{err}</Alert>)))
// }
