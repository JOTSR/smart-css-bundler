// import type { Plugin } from 'fresh'
import { bundle } from 'root'
import { Logger } from 'utils'
import { handler } from './middleware.ts'
import { freshBuildDir } from './utils.ts'
import { join } from '@std/path'

export type SimpleFreshContext = {
	next(): Promise<Response>
	config: {
		build: { outDir: string }
		dev: boolean
	}
}

export type SimpleFreshMiddlewareHandler = (
	request: Request,
	ctx: SimpleFreshContext,
) => Promise<Response>

export type SimpleFreshPlugin = {
	name: string
	middlewares: {
		middleware: {
			handler: SimpleFreshMiddlewareHandler
		}
		path: string
	}[]
	buildStart: (config: SimpleFreshContext['config']) => Promise<void>
}

/**
 * Smart css bundler plugin for [deno/fresh](https://fresh.deno.dev).
 *
 * @param entryPoints CSS files to bundle
 * @param options Bundler options
 * @returns Fresh plugin
 */
export function cssBundler(
	entryPoints: string[],
	options: {
		cacheDir?: string
		externalPaths?: string[]
		logLevel?: 'disabled' | 'debug' | 'info' | 'error'
		disableMiddlewares?: boolean
	} = {},
): SimpleFreshPlugin {
	const {
		cacheDir = undefined,
		externalPaths = [],
		logLevel = 'info',
		disableMiddlewares = false,
	} = options

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
				cacheDir: cacheDir ?? join(config.build.outDir, './cache/css/'),
				externalPaths,
				dev: config.dev,
				logger: logger,
			})
		},
	}
}
