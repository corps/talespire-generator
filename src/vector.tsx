
export class V3 {
	constructor(public x: number, public y: number, public z: number) {
	}

	static fromObj(obj: {x: number, y: number, z: number}) {
		return new V3(obj.x, obj.y, obj.z);
	}

	snap() {
		return new V3(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z));
	}

	scale(f: number): V3;
	scale(f: V3): V3;
	scale(f: number | V3) {
		if (f instanceof V3) {
			return new V3(this.x * f.x, this.y * f.y, this.z * f.z);
		} else {
			return new V3(this.x * f, this.y * f, this.z * f);
		}
	}

	shift(other: V3) {
		return new V3(this.x + other.x, this.y + other.y, this.z + other.z);
	}

	asTuple(): [number, number, number] {
		return [this.x, this.y, this.z];
	}

	static max(a: V3, b: V3): V3 {
		return new V3(Math.max(a.x, b.x), Math.max(a.y, b.y), Math.max(a.z, b.z));
	}

	static min(a: V3, b: V3): V3 {
		return new V3(Math.min(a.x, b.x), Math.max(a.y, b.y), Math.max(a.z, b.z));
	}

	toString() {
		return `x: ${this.x.toFixed(2)}, y: ${this.y.toFixed(2)}, z: ${this.z.toFixed(2)}`
	}
}
