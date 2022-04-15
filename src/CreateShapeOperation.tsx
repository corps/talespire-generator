import {AutoInput, bindParams} from "./autoinputs";
import {SelectInput, SelectInputWithOptions, TextInput} from "./inputs";
import {Asset} from "./AssetLibraryInput";
import {Slab} from "./SlabInput";
import {V3} from "./vector";

const CreateRectangleOperation = AutoInput.fromObj({
	height: AutoInput.fromComponent(bindParams(TextInput, {label: "height"}), "1"),
	width: AutoInput.fromComponent(bindParams(TextInput, {label: "height"}), "1"),
}).map(({width, height}) => {
	const widthN = parseInt(width) || 1;
	const heightN = parseInt(height) || 1;

	return function createRectangle(slab: Slab, library: Record<string, Asset>) {
		const newSlab = new Slab(`${widthN}x${height} rectangle`);

		const asset = Object.values(library)[0];

		// bottom right anchor
		const bottomRightAnchorOffset = new V3(-1, 0, -1).scale(asset.extents);
		let brush = newSlab.repositioned(bottomRightAnchorOffset, 0);
		while (brush.center.x + brush.extents.x < widthN) {
			newSlab.add(brush);
			brush = brush.repositioned(
				brush.center.shift(new V3(Math.max(1, Math.min(brush.extents.x * 2, widthN - brush.extents.x - brush.center.x)), 0, 0)), 0);
		}

		return newSlab;
	}
})

export const CreateShapeOperation = AutoInput.fromObj({
	// type: AutoInput.fromComponent(SelectInputWithOptions(), "")
})
