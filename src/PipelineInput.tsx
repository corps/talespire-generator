import {AutoInput} from "./autoinputs";
import {Box, Divider, Stack} from "@mui/material";
import {mapSome, Maybe} from "./maybe";
import React from "react";

export function Pipeline<T, OperationState>(start: T, selector: AutoInput<OperationState, Maybe<(t: T) => T>>, preview: (t: T) => React.ReactElement | null) {
	return new AutoInput<[OperationState, T][], T>(
		(processors) => {
			if (processors.length === 0) return start;
			const [_, result] = processors[processors.length - 1];
			return result;
		},
		[],
		(processors, onChange) => {
			return <Stack divider={<Divider/>} spacing={1}>
				{processors.map(([o, s], i) =>
					<Box key={i + ""}>
						{selector.render(o, newS => onChange(updateProcessors(i, newS)))}
						{preview(s)}
					</Box>
				)}

				<Box key="new">
					{selector.render(selector.defaultState, newS => onChange(updateProcessors(processors.length + 1, newS)))}
				</Box>
			</Stack>

			function updateProcessors(i: number, o: OperationState) {
				const result: [OperationState, T][] = processors.slice(0, i);
				let s = start;
				for (let j = 0; j < i && j < processors.length; ++j) s = processors[j][1];

				const applyOperation = mapSome((op: (v: T) => T) => {
					s = op(s);
					result.push([o, s])
				})

				applyOperation(selector.output(o))

				for (i += 1; i < processors.length; ++i) {
					o = processors[i][0];
					applyOperation(selector.output(o))
				}

				return result;
			}
		}
	)
}
