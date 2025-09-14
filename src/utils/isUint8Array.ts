// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function isUint8Array(input: any): input is Uint8Array {
	return input instanceof Uint8Array;
}