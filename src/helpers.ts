export class Logger {
	readonly #name = 'bundle_css'
	#logLevel: 0 | 1 | 2

	constructor({ logLevel }: { logLevel: 0 | 1 | 2 }) {
		this.#logLevel = logLevel
	}

	get logLevel() {
		return this.#logLevel
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
