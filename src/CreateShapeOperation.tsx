import {AutoInput, bindParams} from "./autoinputs";
import {TextInput} from "./inputs";
import {Slab} from "./SlabInput";
import {V3} from "./vector";
import {OptionsInput} from "./OptionsInput";

const CreateRectangleOperation = AutoInput.fromObj({
	height: AutoInput.fromComponent(bindParams(TextInput, {label: "height"}), "1"),
	width: AutoInput.fromComponent(bindParams(TextInput, {label: "width"}), "1"),
}).map(({width, height}) => {
	const widthN = parseInt(width) || 1;
	const heightN = parseInt(height) || 1;

	return function createRectangle(slab: Slab) {
		const newSlab = slab.copy([]);

		const asset = Object.values(slab.library)[0];

		// bottom right anchor
		const bottomRightAnchorOffset = new V3(-1, 0, -1).scale(asset.extents);
		let brush = newSlab.repositioned(bottomRightAnchorOffset, 0);
		newSlab.add(brush);
		// brush = brush.repositioned(
		// 	brush.center.shift(new V3(Math.max(1, Math.min(brush.extents.x * 2, widthN - brush.extents.x - brush.center.x)), 0, 0)), 0);

		return newSlab;
	}
})

const CreateShapes = {
	["Rectangle"]: CreateRectangleOperation,
}

export const CreateShapeOperation = OptionsInput<(s: Slab)=> Slab, typeof CreateShapes>(CreateShapes)
