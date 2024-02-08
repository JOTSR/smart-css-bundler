export class Logger {
	readonly #name = 'bundle_css'
	#logLevel: 0 | 1 | 2

	constructor({ logLevel }: { logLevel: 0 | 1 | 2 }) {
		this.#logLevel = logLevel
	}

	info(message: string, path?: string) {
		if (this.#logLevel < 2) return

		console.log(
			`%c[${this.#name}]%c ${message} %c${path ?? ''}`,
			'color: blue; font-weight: bold',
			'',
			'color: green',
		)
	}

	error(message: string, error?: Error) {
		if (this.#logLevel < 1) return

		console.error(
			`%c[${this.#name}]%c ${message} %c${error?.toString() ?? ''}`,
			'color: red; font-weight: bold',
			'',
			'color: yellow',
		)
	}
}

export async function hashFile(file: ArrayBuffer): Promise<string> {
	const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', file))
	return [...hash].map((value) => value.toString(16).padStart(2, '0')).join('')
}

export const cssImports: Map<string, string> = new Map()
export const cssUrls: Map<string, string> = new Map()

export function uInt8ArrayConcat(a: Uint8Array, b: Uint8Array) {
	const dest = new Uint8Array(a.length + b.length)
	dest.set(a)
	dest.set(b, a.length)
	return dest
}
