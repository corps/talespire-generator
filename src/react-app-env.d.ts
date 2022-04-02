/// <reference types="react-scripts" />

declare module 'callable-instance' {
	type Func<Args extends unknown[], Return> = (...argv: Args) => Return;
	class CallableInstance {
		// prettier-ignore
		new <Args extends unknown[], Return>(property: string | symbol): Func<Args, Return>;
	}
	declare const CallableInstance: ICallableInstance;
	export = CallableInstance;
}
