import type { Plugin } from 'fresh'
import { bundle } from 'root'
import { Logger } from 'utils'
import { handler } from './middleware.ts'
import { freshBuildDir } from './utils.ts'

/**
 * Smart css bundler plugin for [deno/fresh](https://fresh.deno.dev).
 *
 * @param entryPoints CSS files to bundle
 * @param options Bundler options
 * @returns Fresh plugin
 */
export function cssBundler(
	entryPoints: string[],
	{ cacheDir = './cache', externalPaths, logLevel, disableMiddlewares = false }:
		{
			cacheDir: string
			externalPaths: string[]
			logLevel?: 'disabled' | 'debug' | 'info' | 'error'
			disableMiddlewares?: boolean
		},
): Plugin {
	const logger = new Logger({
		logLevel: logLevel === 'debug'
			? 3
			: logLevel === 'info'
			? 2
			: logLevel === 'error'
			? 1
			: 0,
	})
	const buildKey = Date.now() % 555555
	const assetNaming = (name: string) => `${name}?_b=${buildKey}`

	const middlewares = disableMiddlewares ? [] : [{
		middleware: {
			handler: handler({
				entryPoints,
				cacheDir,
				assetNaming,
				externalPaths,
				logger,
			}),
		},
		path: '/',
	}]

	return {
		name: 'smart_css_bundler',
		middlewares,
		async buildStart(config) {
			await bundle(entryPoints, {
				bundleDir: freshBuildDir(config.build),
				assetDir: freshBuildDir(config.build),
				assetNaming,
				cacheDir: cacheDir,
				externalPaths,
				dev: config.dev,
				logger: logger,
			})
		},
	}
}
