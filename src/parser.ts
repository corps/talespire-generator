export type ParserProgram<T, InputType> = (state: number, input: InputType) => [T, number];

export class BaseParser<T, InputType> {
	constructor(public f: ParserProgram<T, InputType>) {}

	bind<R>(other: (t: T) => ParserProgram<R, InputType>): ParserProgram<R, InputType> {
		return (state, input) => {
			const [result, state_] = this.f(state, input);
			return other(result)(state_, input);
		};
	}

	map<R>(f: (r: T) => R): ParserProgram<R, InputType> {
		return (state, input) => {
			const [result, state_] = this.f(state, input);
			return [f(result), state_];
		}
	}

	static just<T>(t: T): ParserProgram<T, any> {
		return (state) => [t, state];
	}

	proceededBy(other: ParserProgram<any, InputType>): ParserProgram<T, InputType> {
		const orig = this;
		return (state, input) => {
			const [_, state_] = other(state, input);
			const [result, state__] = orig.f(state_, input);
			return [result, state__];
		};
	}

	terminatedBy(other: ParserProgram<any, InputType>): ParserProgram<T, InputType> {
		const orig = this;
		return (state, input) => {
			const [result, state_] = orig.f(state, input);
			const state__ = other(state_, input)[1];
			return [result, state__];
		};
	}
}

export class StringParser<T> extends BaseParser<T, string> {
	static nextMatching(r: RegExp): ParserProgram<string, string> {
			return (state, input) => {
					const match: RegExpMatchArray | null = input.slice(state).match(r);
					if (match == null || match.index != 0 || !match[0]) {
							throw new Error("Expected matching " + r.source + " but did not find any");
					}

					return [match[0], state + match[0].length];
			}
  }

  static matchLiteral(s: string): ParserProgram<string, string> {
			return (state, input) => {
					if (input.slice(state, state + s.length) === s) {
							return [s, state + s.length];
					}

					throw new Error('Expected ' + JSON.stringify(s) + ' near ' + JSON.stringify(input.slice(state, state + 10)));
			}
	}
}

export class Apply1<InputType, I, O> extends BaseParser<(i: I) => O, InputType> {
    apply(other: ParserProgram<I, InputType>): BaseParser<O, InputType> {
        return new BaseParser((state, input) => {
            const [f, state_] = this.f(state, input);
            const [i, state__] = other(state_, input);

            return [f(i), state__];
        });
    }
}

export class Apply2<InputType, I1, I2, O> extends Apply1<InputType, I1, (i2: I2) => O> {
	apply(other: ParserProgram<I1, InputType>): Apply1<InputType, I2, O> {
		return new Apply1(super.apply(other).f);
	}
}

export class Apply3<InputType, I1, I2, I3, O> extends Apply2<InputType, I1, I2, (i3: I3) => O> {
	apply(other: ParserProgram<I1, InputType>): Apply2<InputType, I2, I3, O> {
		return new Apply2(super.apply(other).f);
	}
}

// type RecursiveParsing
// Potential Line
// "a b c"
// Program = [Range, Parser<Statement[]>]
// Statement = [Range, Parser<[ExpressionHead, Expression]>]
// ExpressionHead = [Range, Parser<[LetBinding, DefBinding, ReturnBinding]>]
// Expression = [Range, Parser<Literal | Call>]

// export const skipWhitespace = Parser.nextMatching(/\s*/)
// export const matchWhitespace = Parser.nextMatching(/\s+/);
// export const matchEof = Parser.nextMatching(/$/);
// export const matchNumber: Parser<number> = Parser.nextMatching(/[+-]?([0-9]*[.])?[0-9]+([eE][-+]?[0-9]+)?/).map(s => parseFloat(s));
// export const emptyObject = new ObjectBuildingParser<{}>((s) => [{}, s]);
// export const emptyTuple = new TupleBuildingParser<[]>((s) => [[], s]);
