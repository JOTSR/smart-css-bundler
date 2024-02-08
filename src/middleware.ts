import {
	contentType,
	ensureDir,
	join,
	MiddlewareHandler,
	parse,
} from '../deps.ts'
import { bundleCss } from './bundler.ts'
import { Logger } from './helpers.ts'

export function cssHandler(
	sourceDir: string,
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

				await bundleCss(
					sourceDir,
					assetDir,
					ctx.url.pathname,
					ctx.config.dev,
					logger,
				)

				const file = await Deno.readFile(filename)
				return new Response(file, {
					headers: {
						'Content-Type': 'text/css; charset=utf-8',
					},
				})
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
