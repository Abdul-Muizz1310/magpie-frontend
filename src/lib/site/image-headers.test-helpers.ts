/** Read image dimensions straight from file headers, so the tests need no image library. */

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function pngSize(buf: Buffer): string {
	if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("not a PNG");
	return `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`;
}

/** The square sizes an .ico holds; a width byte of 0 means 256. */
export function icoSizes(buf: Buffer): number[] {
	if (buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) throw new Error("not an ICO");
	const count = buf.readUInt16LE(4);
	return Array.from({ length: count }, (_, i) => buf[6 + 16 * i] || 256).sort((a, b) => a - b);
}
