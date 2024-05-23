import { ensureDir } from '@std/fs'
import { join, parse } from '@std/path'
import { contentType } from '@std/media-types'
import { MiddlewareHandler } from 'fresh'
import { bundleCss } from './bundler.ts'
import { Logger } from './helpers.ts'

export function cssHandler(
	sourceDir: string,
	cacheDir: string,
	logger: Logger,
): MiddlewareHandler {
	return async (_, ctx) => {
		const assetDir = join(ctx.config.build.outDir, '/static')
		await ensureDir(assetDir)

		if (ctx.config.dev) {
			if (
				ctx.url.pathname.startsWith('/') && ctx.url.pathname.endsWith('.css')
			) {
				const filename = join(assetDir, ctx.url.pathname)

				if (ctx.url.pathname.endsWith('.map.css')) {
					const file = await Deno.readFile(filename)
					return new Response(file, {
						headers: {
							'Content-Type': 'application/json; charset=utf-8',
						},
					})
				}

				if (!bundled.has(ctx.url.pathname)) {
					bundled.add(ctx.url.pathname)
					await bundleCss(
						join(sourceDir, ctx.url.pathname),
						join(assetDir, ctx.url.pathname),
						cacheDir,
						ctx.config.dev,
						logger,
					)
				}

				try {
					const file = await Deno.readFile(filename)
					return new Response(file, {
						headers: {
							'Content-Type': 'text/css; charset=utf-8',
						},
					})
				} catch (error) {
					console.error(error)
					return ctx.next()
				}
			}
		}

		const resp = await ctx.next()

		if (resp.status === 404) {
			try {
				const file = await Deno.readFile(join(assetDir, ctx.url.pathname))
				const { ext } = parse(ctx.url.pathname)

				return new Response(file, {
					headers: {
						'Content-Type': contentType(ext) ?? 'text/plain; charset=utf-8',
					},
				})
			} catch {
				return resp
			}
		}

		//anyway
		return resp
	}
}

const bundled: Set<string> = new Set()
