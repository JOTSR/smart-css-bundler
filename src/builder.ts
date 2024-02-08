import { bundleAsync, join, parse, resolve, toFileUrl } from '../deps.ts'
import { cssImports, cssUrls, Logger, uInt8ArrayConcat } from './helpers.ts'

export async function builder(
	{ filename, dev, assetDir, remote, logger }: {
		filename: string
		dev: boolean
		assetDir: string
		remote?: string
		logger: Logger
	},
) {
	const { code, map } = await bundleAsync({
		filename,
		minify: true,
		sourceMap: dev,
		resolver: {
			async read(pathOrUrl) {
				if (pathOrUrl.startsWith('https%3A%2F%2F')) {
					pathOrUrl = decodeURIComponent(pathOrUrl)
				}
				if (pathOrUrl.startsWith('https://')) {
					//use cache for remote
					if (cssImports.has(pathOrUrl)) {
						logger.info('using cache for', `${pathOrUrl}`)
						const filepath = cssImports.get(pathOrUrl)!
						return Deno.readTextFile(filepath)
					}

					//update cache for new remote
					logger.info('fetching and caching', `${pathOrUrl}`)
					const response = await fetch(pathOrUrl)
					const file = await response.arrayBuffer()
					const filename = encodeURIComponent(pathOrUrl.toString())

					const filepath = join(assetDir, `${filename}.css`)
					await Deno.writeFile(filepath, new Uint8Array(file))

					setTimeout(() => {}, 3_000)
					const { code, map } = await builder({
						filename: filepath,
						dev,
						assetDir,
						remote: pathOrUrl,
						logger,
					})

					if (map) {
						const sourceMappingURL = new TextEncoder().encode(
							`\n/*# sourceMappingURL=${filepath}.map.css */`,
						)
						await Deno.writeFile(
							filepath,
							uInt8ArrayConcat(code, sourceMappingURL),
						)
						await Deno.writeFile(`${filepath}.map.css`, map)
					} else {
						await Deno.writeFile(filepath, code)
					}

					cssImports.set(pathOrUrl, filepath)

					return new TextDecoder().decode(file)
				}
				return Deno.readTextFile(pathOrUrl)
			},
			resolve(specifier, from) {
				if (remote) {
					const url = new URL(specifier, remote)
					logger.info('resolve remote imports', url.toString())

					return url.toString()
				}

				//resolve local files normally
				if (!specifier.startsWith('https://') && !from.startsWith('https://')) {
					logger.info('resolve local file', specifier)
					return resolve(parse(from).dir, specifier)
				}

				//construct asset url
				const baseUrl = from.startsWith('https://') ? from : toFileUrl(from)
				const url = new URL(specifier, baseUrl)
				logger.info('resolve remote file', url.toString())

				return url.toString()
			},
		},
		visitor: {
			Url({ loc, url }) {
				if (remote && !url.startsWith('data:')) {
					cache(url, remote, assetDir)
				}
				return { loc, url }
			},
		},
	})

	return { code, map }
}

async function cache(url: string, base: string, assetDir: string) {
	const filepath = join(assetDir, url.split('?')[0])
	const fullUrl = new URL(url, base)

	if (cssUrls.has(fullUrl.pathname)) {
		return
	}

	cssUrls.set(fullUrl.pathname, filepath)
	const response = await fetch(fullUrl)
	const file = await response.arrayBuffer()
	await Deno.writeFile(filepath, new Uint8Array(file))
}
