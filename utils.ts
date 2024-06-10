import { resolve } from '@std/path'

/**
 * Custom plugin logger.
 */
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

/**
 * Get the disjoint path between a parent and a children path.
 *
 * @param parent Parent path
 * @param children Children path
 * @returns Return the disjoint path
 */
export function disjointPath(parent: string, children: string): string {
	const absParent = resolve(Deno.cwd(), parent)
	const absChildren = resolve(Deno.cwd(), children)

	const [_, disjoint] = absChildren.split(absParent)

	return disjoint.replaceAll('\\', '/')
}

/**
 * Retrieve remote url from cached file path.
 *
 * @param cacheDir Cache directory
 * @param cacheFile Cache file
 * @returns Cache file original url
 */
export function cachePathToRemoteUrl(cacheDir: string, cacheFile: string): URL {
	const pathname = disjointPath(cacheDir, cacheFile)

	const match = pathname.match(/^\/(?<protocol>\w+)\/(?<href>.+)/)

	if (match === null || match.groups === undefined) {
		throw new SyntaxError(
			`invalid cached pathname (${pathname}) not like "<cache_dir>/<protocol>/<href>"`,
		)
	}

	const { protocol, href } = match.groups as { protocol: string; href: string }

	return new URL(`${protocol}://${href}`)
}
