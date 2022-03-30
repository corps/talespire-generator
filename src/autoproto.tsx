export interface DataViewAccessor<State, NState> {
	read([state, idx]: [State, number], dv: DataView): [NState, number];
	write([state, idx]: [NState, number]): [[State, number], (dv: DataView) => void];
}

export function translate<InState1, OutState1, OutState2>(a: DataViewAccessor<InState1, OutState1>, fin: (i: OutState1) => OutState2, fout: (o: OutState2) => OutState1): DataViewAccessor<InState1, OutState2> {
	return {
		read([state, idx]: [InState1, number], dv: DataView): [OutState2, number] {
			const [s, i] = a.read([state, idx], dv);
			return [fin(s), i];
		},
		write([state, idx]: [OutState2, number]): [[InState1, number], ((dv: DataView) => void)] {
			return a.write([fout(state), idx]);
		}
	}
}

export function concat<InState1, InState2, OutState1, OutState2>(a: DataViewAccessor<InState1, OutState1>, b: DataViewAccessor<InState2, OutState2>):
	DataViewAccessor<[InState1, InState2], [OutState1, OutState2]>{
	return {
		read([state, idx]: [[InState1, InState2], number], dv: DataView): [[OutState1, OutState2], number] {
			let lState: OutState1;
			let rState: OutState2;

			([lState, idx] = a.read([state[0], idx], dv));
			([rState, idx] = b.read([state[1], idx], dv));

			return [[lState, rState], idx];
		},
		write([[lState, rState], idx]: [[OutState1, OutState2], number]): [[[InState1, InState2], number], ((dv: DataView) => void)] {
			let lStateIn: InState1;
			let rStateIn: InState2;
			let lWriter: (dv: DataView) => void;
			let rWriter: (dv: DataView) => void;

			([[lStateIn, idx], lWriter] = a.write([lState, idx]));
			([[rStateIn, idx], rWriter] = b.write([rState, idx]));

			return [[[lStateIn, rStateIn], idx], (dv: DataView) => {
				lWriter(dv);
				rWriter(dv);
			}]
		}
	}
}

export function numeric(signed: boolean, bytes: number, endianness: boolean): DataViewAccessor<null, number> {
	return {
		read([_, idx]: [null, number], dv: DataView) {
			if (idx + bytes >= dv.buffer.byteLength) {
				throw new Error('Unexpected EOF!');
			}

			let value: number = 0;
			if (signed) {
				switch (bytes) {
					case 1:
						value = dv.getInt8(idx);
						break;
					case 2:
						value = dv.getInt16(idx, endianness);
						break;
					case 4:
						value = dv.getInt32(idx, endianness);
						break;
					default:
						throw new Error('Unexpected size ' + bytes + ' bytes');
				}
			} else {
				switch (bytes) {
					case 1:
						value = dv.getUint8(idx);
						break;
					case 2:
						value = dv.getUint16(idx, endianness);
						break;
					case 4:
						value = dv.getUint32(idx, endianness);
						break;
					default:
						throw new Error('Unexpected size ' + bytes + ' bytes');
				}
			}

			return [value, idx + bytes];
		},
		write([value, idx]: [number, number]): [[null, number], ((dv: DataView) => void)] {
			return [
				[null, idx + bytes],
				(dv: DataView) => {
					if (signed) {
						switch (bytes) {
							case 1:
								dv.setInt8(idx, value);
								break;
							case 2:
								dv.setInt16(idx, value, endianness);
								break;
							case 4:
								dv.setInt32(idx, value, endianness);
								break;
							default:
								throw new Error('Unexpected size ' + bytes + ' bytes');
						}
					} else {
						switch (bytes) {
							case 1:
								dv.setUint8(idx, value);
								break;
							case 2:
								dv.setUint16(idx, value, endianness);
								break;
							case 4:
								dv.setUint32(idx, value, endianness);
								break;
							default:
								throw new Error('Unexpected size ' + bytes + ' bytes');
						}
					}
				}
			]
		}
	};
}

export const hexDigit = translate(numeric(false, 1, false), byte => ('0' + byte.toString(16)).slice(-2), v => parseInt(v, 255));

export function repeat<OutState>(repeatable: DataViewAccessor<null, OutState>): DataViewAccessor<number, OutState[]> {
	return {
		read([state, idx]: [number, number], dv: DataView): [OutState[], number] {
			const result: OutState[] = [];
			let next: OutState;
			for (let i = 0; i < state; ++i) {
				([next, idx] = repeatable.read([null, idx], dv));
			}

			return [result, idx];
		},
		write([state, idx]: [OutState[], number]): [[number, number], ((dv: DataView) => void)] {
			const writers: ((dv: DataView) => void)[] = [];
			state.forEach(output => {
				const [[_, nextIdx], nextWriter] = repeatable.write([output, idx]);
				idx = nextIdx;
				writers.push(nextWriter);
			})
			return [
				[state.length, idx],
				(dv: DataView) => writers.forEach(w => w(dv))
			]
		}
	};
}

export function connect<StartState, MidState, EndState>(a: DataViewAccessor<StartState, MidState>, b: DataViewAccessor<MidState, EndState>): DataViewAccessor<StartState, EndState> {
	return {
		read([state, idx]: [StartState, number], dv: DataView): [EndState, number] {
			return b.read(a.read([state, idx], dv), dv);
		},
		write([state, idx]: [EndState, number]): [[StartState, number], ((dv: DataView) => void)] {
			const [[midState, midIdx], endWriter] = b.write([state, idx]);
			const [[startState, startIdx], startWriter] = a.write([midState, midIdx])
			return [[startState, startIdx], (dv) => {
				startWriter(dv);
				endWriter(dv);
			}]
		}
	}
}

export function lift<V>(l: V): DataViewAccessor<null, V> {
	return {
		read([state, idx]: [null, number], dv: DataView): [V, number] {
			return [l, idx];
		},
		write([state, idx]: [V, number]): [[null, number], ((dv: DataView) => void)] {
			return [[null, idx], () => null];
		}
	}
}


export function read<I, O>(accessor: DataViewAccessor<I, O>, dv: DataView, i: I): O {
	return accessor.read([i, 0], dv)[0];
}

export function write<I, O>(accessor: DataViewAccessor<I, O>, o: O): DataView {
	const [[_, size], writer] = accessor.write([o, 0]);
	const array = new Uint8Array(size);
	const dv = new DataView(array);
	writer(dv);
	return dv;
}
