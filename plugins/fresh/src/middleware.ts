import { contentType } from '@std/media-types'
import { join, parse } from '@std/path'
// import type { MiddlewareHandler } from 'fresh'
import { bundle } from 'root'
import type { Logger } from 'utils'
import type { SimpleFreshMiddlewareHandler } from './plugin.ts'
import { freshBuildDir } from './utils.ts'

/**
 * Fresh middleware to bundle css sources files.
 *
 * @param options Middleware handler options
 * @returns Fresh middleware
 */
export function handler({
	entryPoints,
	cacheDir = undefined,
	bundleSubDir,
	assetNaming,
	externalPaths,
	logger,
}: {
	entryPoints: string[]
	cacheDir?: string
	bundleSubDir: string
	assetNaming: (name: string) => string
	externalPaths: string[]
	logger: Logger
}): SimpleFreshMiddlewareHandler {
	let bundled = false

	return async (request, ctx) => {
		// Shortcut middleware if not in dev mode
		if (!ctx.config.dev) {
			return ctx.next()
		}

		const outDir = freshBuildDir(ctx.config.build, bundleSubDir)

		// Start bundle only once time in watch mode
		if (!bundled) {
			await bundle(entryPoints, {
				bundleDir: outDir,
				assetDir: outDir,
				assetNaming,
				cacheDir: cacheDir ?? join(ctx.config.build.outDir, './cache/css/'),
				externalPaths,
				dev: ctx.config.dev,
				logger: logger,
			})

			bundled = true
		}

		const { pathname } = new URL(request.url)
		const filepath = join(outDir, pathname)
		const { ext } = parse(filepath)

		try {
			// Get bundled files if exists
			const file = await Deno.open(filepath)
			const headers = {
				'Content-Type': contentType(ext) ?? 'text/plain; charset=utf-8',
			}

			await ctx.next()
			return new Response(file.readable, { headers })
		} catch {
			// Leave response render to next middleware
			return ctx.next()
		}
	}
}
