import { Logger } from './helpers.ts'
import { ensureFile, exists } from 'jsr:@std/fs'
import { fromFileUrl, join, toFileUrl } from 'jsr:@std/path'
import { bundleAsync } from 'npm:lightningcss@1.25.0'

export async function buildCss(
	filename: string,
	cacheDir: string,
	dev: boolean,
	logger: Logger,
): Promise<string> {
	const bundle = await bundleAsync({
		filename: fromFileUrl(filename),
		minify: true,
		sourceMap: dev,
		resolver: {
			async resolve(specifier, from) {
				// Resolve local path or remote url
				const basePath = import.meta.resolve(from)
				const baseUrl = /^((https?)|(file)):\/\//.test(basePath)
					? basePath
					: toFileUrl(basePath)
				const url = new URL(specifier, baseUrl)

				// Return local path
				if (url.protocol === 'file:') {
					logger.info('resolving local file', filename)
					console.assert(true) // Prevent lightning css from exiting event loop
					return fromFileUrl(url.href)
				}

				// Compute cache path
				const cachePath = join(cacheDir, url.hostname, url.pathname)

				// Return already cached file
				if (await exists(cachePath)) {
					logger.info('resolving cached file', cachePath)
					return cachePath
				}

				logger.info('resolving remote file', url.href)

				try {
					// Fetch remote url
					const response = await fetch(url)
					const css = await response.text()

					// Cache remote url
					await ensureFile(cachePath)
					await Deno.writeTextFile(cachePath, css)
					// await cacheFile(url, cachePath)

					// Return cached file
					return cachePath
				} catch (error) {
					logger.error(error)
					throw new Error(`unable to fetch ${url.href}`, { cause: error })
				}
			},
		},
	})

	const css = new TextDecoder().decode(bundle.code)

	if (dev) {
		const sourceMap = new TextDecoder().decode(bundle.map ?? new Uint8Array())
		return `${css} /*# sourceMappingURL=${encodeURI(sourceMap)} */`
	}

	return css
}
