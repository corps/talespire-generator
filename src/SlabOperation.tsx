import {AutoInput} from "./autoinputs";
import {Slab} from "./SlabInput";
import {CreateShapeOperation} from "./CreateShapeOperation";
import React from "react";
import {OptionsInput} from "./OptionsInput";
import {mapSome, Maybe, some} from "./maybe";
import {SlabPreview} from "./SlabPreview";
import {Pipeline} from "./PipelineInput";

type Operation = (s: Slab) => Slab

const SlabOperators = {
	[""]: AutoInput.lift(null, null as Maybe<Operation>),
	["Create Shape"]: CreateShapeOperation.map(some),
}

export const SlabOperation = OptionsInput<Maybe<Operation>, typeof SlabOperators>(SlabOperators);

export function SlabPipeline(slab: Slab) {
	return Pipeline(
		slab,
		SlabOperation.map(mapSome(op => (s: Slab) => op(s.copy()))),
		s => <SlabPreview slab={s}/>
	)
}
