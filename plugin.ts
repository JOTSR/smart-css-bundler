import { fromFileUrl, Plugin } from './deps.ts'
import { bundleCss } from './src/bundler.ts'
import { Logger } from './src/helpers.ts'
import { cssHandler } from './src/middleware.ts'

export function cssBundler(
	sourceDir: string,
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
		middleware: { handler: cssHandler(sourceDir, logger) },
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
					tasks.push(
						bundleCss(sourceDir, outDir, entry.name, config.dev, logger),
					)
				}
			}

			//Await for all bundle to finish
			await Promise.all(tasks)
		},
	}
}
