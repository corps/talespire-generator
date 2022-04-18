import {AutoInput} from "./autoinputs";
import {Slab} from "./SlabInput";
import {Asset} from "./AssetLibraryInput";
import {CreateShapeOperation} from "./CreateShapeOperation";
import {SelectInputWithOptions} from "./inputs";

const SlabOperators = {
	[""]: AutoInput.lift(null, (slab: Slab) => slab),
	["Create Shape"]: CreateShapeOperation,
}

export const SlabOperationInput = AutoInput.fromOptions(SlabOperators,
	AutoInput.fromComponent(SelectInputWithOptions(Object.keys(SlabOperators)), ""));

export const SlabPipelineInput = AutoInput.several(SlabOperationInput, ([i]) => !!i);

export function applyPipeline(pipeline: ((slab: Slab) => Slab)[], slab: Slab) {
	pipeline.forEach(f => { slab = f(slab) });
	return slab;
}
