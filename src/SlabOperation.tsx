import {AutoInput} from "./autoinputs";
import {Slab} from "./SlabInput";
import {CreateShapeOperation} from "./CreateShapeOperation";
import React from "react";
import {OptionsInput} from "./OptionsInput";
import { mapSome, Maybe, some} from "./maybe";
import {SlabPreview} from "./SlabPreview";

type Operation = (s: Slab) => Slab

const SlabOperators = {
	[""]: AutoInput.lift(null, null as Maybe<Operation>),
	["Create Shape"]: CreateShapeOperation.map(some),
}

export const SlabOperation = OptionsInput<Maybe<Operation>, typeof SlabOperators>(SlabOperators);
export type OperationState = typeof SlabOperation.defaultState;

export function SlabPipeline(slab: Slab) {
	return new AutoInput<[OperationState, Slab][], Slab>(
		(processors) => {
			if (processors.length === 0) return slab;
			const [_, result] = processors[processors.length - 1];
			return result;
		},
		[],
		(processors, onChange) => {
			return <>
				{processors.map(([o, s], i) =>
					<React.Fragment key={i + ""}>
						{SlabOperation.render(o, newS => onChange(updateProcessors(i, newS)))}
						<SlabPreview slab={s}/>
					</React.Fragment>
				)}

				{SlabOperation.render(SlabOperation.defaultState, newS => onChange(updateProcessors(processors.length + 1, newS)))}
			</>

			function updateProcessors(i: number, o: OperationState) {
				const result: [OperationState, Slab][] = processors.slice(0, i);
				let s = slab;
				for (let j = 0; j < i && j < processors.length; ++j) s = processors[j][1];

				const applyOperation = mapSome((op: Operation) => {
					s = op(s);
					result.push([o, s])
				})

				applyOperation(SlabOperation.output(o))

				for (i += 1; i < processors.length; ++i) {
					o = processors[i][0];
					applyOperation(SlabOperation.output(o))
				}

				return result;
			}
		}
	)
}
