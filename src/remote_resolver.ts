import { OnResolveArgs, OnResolveResult, type PluginBuild } from 'esbuild'
import { cachePathToRemoteUrl } from '../utils.ts'
import { BundleOptions } from './bundle.ts'
import { cacheAssetFile, cacheRemoteFile } from './caching.ts'
import { getLoader } from './get_loader.ts'

/** Bundler HTTP resolver options */
type RemoteResolverOptions = Omit<
	BundleOptions,
	'bundleDir' | 'bundleNaming' | 'externalPaths'
>

/**
 * Esbuild plugin to resolve remote css and assets files.
 *
 * @param options Remote resolver options
 * @returns Esbuild remote resolver plugin
 */
export function remoteResolver(
	options: RemoteResolverOptions,
) {
	const { dev, logger } = options
	logger?.info('resolving files')

	return {
		name: 'css-remote-resolver',
		setup(build: PluginBuild) {
			build.onResolve({ filter: /.*/ }, (args) => {
				// Resolve absolute remote css and assets
				if (/^(https?:\/\/).*/.test(args.path)) {
					return resolveAbsoluteRemote(options, args)
				}

				// Resolve relative remote assets
				if (args.namespace === 'remote') {
					return resolveRelativeRemote(options, args)
				}

				// Watching local files
				if (dev) {
					logger?.debug(
						'watching local source file',
						args.path,
					)

					// Mark assets as external paths
					if (!args.path.endsWith('.css')) {
						return { watchFiles: [args.path], external: true }
					}

					return { watchFiles: [args.path] }
				}
			})

			// Load cache files (css)
			build.onLoad({ filter: /.*/, namespace: 'remote' }, async (args) => {
				logger?.debug('loading cached file', args.path)
				const contents = await Deno.readFile(args.path)
				return { contents, loader: args.pluginData.loader }
			})
		},
	}
}

/**
 * Resolves remote css and assets from their absolute url
 *
 * @param options Resolver options
 * @param args Esbuild context
 * @returns Esbuild resolve result
 */
async function resolveAbsoluteRemote(
	{ cacheDir, assetDir, assetNaming, logger }: RemoteResolverOptions,
	{ path }: OnResolveArgs,
): Promise<OnResolveResult> {
	logger?.debug('resolving absolute remote file', path)

	// Get remote file
	const response = await fetch(path)
	const loader = getLoader(path, response)

	// Resolve remote css
	if (loader === 'css') {
		const cacheFile = await cacheRemoteFile(cacheDir, response)
		return {
			path: cacheFile,
			namespace: 'remote',
			pluginData: { loader },
		}
	}

	// Resolve remote asset
	const assetFilePath = await cacheAssetFile(assetDir, response)
	const assetFile = await assetNaming?.(assetFilePath) ?? assetFilePath
	return {
		path: assetFile,
		namespace: 'remote',
		pluginData: { loader },
		external: true,
	}
}

/**
 * Resolves remote css and assets from their relative url
 *
 * @param options Resolver options
 * @param args Esbuild context
 * @returns Esbuild resolve result
 */
async function resolveRelativeRemote(
	{ cacheDir, assetDir, assetNaming, logger }: RemoteResolverOptions,
	args: OnResolveArgs,
): Promise<OnResolveResult> {
	// Don't resolve data url
	if (args.path.startsWith('data:')) {
		return {
			path: args.path,
			external: true,
			namespace: 'remote',
			pluginData: { loader: 'dataurl' },
		}
	}

	// Resolve relative asset
	if (args.kind === 'url-token') {
		// Get absolute url
		const importerUrl = cachePathToRemoteUrl(cacheDir, args.importer)
		const url = new URL(args.path, importerUrl)

		logger?.debug(
			`resolving relative remote asset from (${importerUrl.href})`,
			args.path,
		)

		// Resolve remote asset
		const response = await fetch(url)
		const assetFilePath = await cacheAssetFile(assetDir, response)
		const loader = getLoader(url.pathname, response)
		const assetFile = await assetNaming?.(assetFilePath) ??
			assetFilePath

		return {
			path: assetFile,
			external: true,
			namespace: 'remote',
			pluginData: { loader },
		}
	}

	throw new Error(
		`unsupported source path kind for css bundle (kind: ${args.kind})`,
	)
}
