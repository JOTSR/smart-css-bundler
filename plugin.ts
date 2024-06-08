// import type { Plugin } from 'fresh'
import type { Plugin } from 'https://deno.land/x/fresh@1.6.8/server.ts'
// import { fromFileUrl, join } from '@std/path'
import { fromFileUrl, join } from 'jsr:@std/path@^0.225.1'
import { bundleCss } from './src/bundler.ts'
import { Logger } from './src/helpers.ts'
import { cssHandler } from './src/middleware.ts'

export function cssBundler(
	sourceDir: string,
	cacheDir: string,
	{ pattern = /main.css/, logLevel, disableMiddlewares = false }: {
		pattern?: RegExp
		logLevel?: 'disabled' | 'info' | 'error'
		disableMiddlewares?: boolean
	},
): Plugin {
	const logger = new Logger({
		logLevel: logLevel === 'info' ? 2 : logLevel === 'error' ? 1 : 0,
	})

	const middlewares = disableMiddlewares ? [] : [{
		middleware: { handler: cssHandler(sourceDir, cacheDir, logger) },
		path: '/',
	}]

	return {
		name: 'css_bundler',
		middlewares,
		async buildStart(config) {
			//Get fresh build directory
			const { outDir } = config.build
			const tasks: Promise<void>[] = []

			//Get all source stylesheets
			for await (const entry of Deno.readDir(fromFileUrl(sourceDir))) {
				if (entry.isFile && entry.name.match(pattern)) {
					const sourceFile = join(sourceDir, entry.name)
					const outFile = join(outDir, entry.name)
					tasks.push(
						bundleCss(sourceFile, outFile, cacheDir, config.dev, logger),
					)
				}
			}

			//Await for all bundle to finish
			await Promise.all(tasks)
		},
	}
}
