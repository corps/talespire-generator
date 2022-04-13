// import {Dispatch, ReactElement, useEffect, useMemo, useState, VFC} from "react";
//
// type UnwrapReturn<T> = T extends (p: any) => infer O ? UnwrapReturn<O> : T;
//
// export class AutoMemo<I, O> {
// 	constructor(public output: (i: I) => O, public defaultState: I) {
// 	}
//
// 	withDefault(i: I) {
// 		return new AutoMemo(this.output, i);
// 	}
//
// 	map<R>(f: (t: O) => R): AutoMemo<I, R> {
// 		return map(this, f);
// 	}
//
// 	static lift<I extends any[], V>(i: I, v: V): AutoMemo<I, V> {
// 		return lift(i ,v);
// 	}
//
// 	static apply = apply;
//
// 	bind<I2, R>(f: (o: O) => AutoMemo<I2, R>) {
// 		return bind<I, I2, O, R>(this, f);
// 	}
//
// 	static fromObj<Inputs extends Record<string, AutoMemo<any, any>>>(inputs: Inputs) {
// 		return fromObj(inputs);
// 	}
//
// 	order<E>(values: E[]): I extends [E, E[]] ? AutoMemo<E[], O[]> : never {
// 		return order(values, this as any) as any;
// 	}
// }
//
// export function useAutoMemo<I, O>(memo: AutoMemo<I, O>, i: I): O {
// 	return useMemo(() => memo.output(i), [i, memo]);
// }
//
// function map<I, O, R>({output, defaultState}: AutoMemo<I, O>, f: (t: O) => R): AutoMemo<I, R> {
// 	return new AutoMemo<I, R>((v: I) => f(output(v)), defaultState);
// }
//
// function lift<I, V>(i: I, v: V): AutoMemo<I, V> {
// 	return new AutoMemo<I, V>(() => v, i);
// }
//
// function apply<I1, I2, P1, O>(f: AutoMemo<I1, (p: P1) => O>, p: AutoMemo<I2, P1>): AutoMemo<[I2, I1], O> {
// 	const output = function output([b, a]: [I2, I1]): O {
// 		return f.output(a)(p.output(b));
// 	}
// 	const defaultState = [p.defaultState, f.defaultState] as [I2, I1];
// 	return new AutoMemo<[I2, I1], O>(output, defaultState);
// }
//
// function applyNamed<K extends string, I1 extends Record<K, any>, I2, P1, O>(k: K, f: AutoMemo<I1, (p: P1) => O>, p: AutoMemo<I2, P1>): AutoMemo<I1, O> {
// 	const output = function output(v: I1): O {
// 		return f.output(v)(p.output(v[k]));
// 	}
// 	const defaultState = {...f.defaultState, [k]: p.defaultState};
// 	return new AutoMemo<I1, O>(output, defaultState);
// }
//
// function bind<I1, I2, P1, O>(p: AutoMemo<I1, P1>, f: (p: P1) => AutoMemo<I2, O>): AutoMemo<[I2, I1], O> {
// 	const output = function output([b, a]: [I2, I1]): O {
// 		return f(p.output(a)).output(b);
// 	}
// 	const defaultState = [f(p.output(p.defaultState)).defaultState, p.defaultState] as [I2, I1];
// 	return new AutoMemo<[I2, I1], O>(output, defaultState);
// }
//
// type UnwrapAutoMemo<T extends AutoMemo<any, any>> = T extends AutoMemo<any, infer V> ? V : unknown;
// type UnwrapAutoMemoRecord<Inputs extends Record<string, AutoMemo<any, any>>> = {
// 	[A in keyof Inputs]: UnwrapAutoMemo<Inputs[A]>
// }
//
// type UnwrapAutoMemoInput<T extends AutoMemo<any, any>> = T extends AutoMemo<infer V, any> ? V : unknown;
// type UnwrapAutoMemoInputRecord<Inputs extends Record<string, AutoMemo<any, any>>> = {
// 	[A in keyof Inputs]: UnwrapAutoMemoInput<Inputs[A]>
// }
//
// function fromObj<Inputs extends Record<string, AutoMemo<any, any>>>(inputs: Inputs): AutoMemo<
// 	UnwrapAutoMemoInputRecord<Inputs>, UnwrapAutoMemoRecord<Inputs>
// 	> {
// 	const keys = Object.keys(inputs);
// 	let result = lift({} as UnwrapAutoMemoInputRecord<Inputs>, {}) as AutoMemo<UnwrapAutoMemoInputRecord<Inputs>, UnwrapAutoMemoRecord<Inputs>>;
// 	keys.forEach(k => {
// 		result = applyNamed(
// 			k,
// 			map(result,(existing: UnwrapAutoMemoRecord<Inputs>) => (nextValue: UnwrapAutoMemoRecord<Inputs>) => ({...existing, [k]: nextValue}) ),
// 			map(inputs[k], v => ({[k]: v}) as UnwrapAutoMemoRecord<Inputs>)
// 		);
// 	})
//
// 	return result;
// }
//
//
// function order<I, O>(values: I[], selector: AutoMemo<[I, I[]], O>): AutoMemo<I[], O[]> {
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
// 	const output = function output(i: I[]): O[] {
// 		const reordered = reorder(i);
// 		return reordered.map(selector.output);
// 	}
//
// 	return new AutoMemo<I[], O[]>(output, values);
// }
