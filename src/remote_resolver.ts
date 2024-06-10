import { type PluginBuild } from 'esbuild'
import { cachePathToRemoteUrl } from '../utils.ts'
import { BundleOptions } from './bundle.ts'
import { cacheAssetFile, cacheRemoteFile } from './caching.ts'
import { getLoader } from './get_loader.ts'

/** Bundler HTTP resolver options */
type RemoteResolverOptions = Omit<BundleOptions, 'bundleDir' | 'bundleNaming'>

/**
 * Esbuild plugin to resolve remote css and assets files.
 *
 * @param options Remote resolver options
 * @returns Esbuild remote resolver plugin
 */
export function remoteResolver(
	{ cacheDir, assetDir, assetNaming, dev, logger }: RemoteResolverOptions,
) {
	return {
		name: 'css-remote-resolver',
		setup(build: PluginBuild) {
			// Resolve absolute remote css and assets
			build.onResolve({ filter: /^https?:\/\// }, async (args) => {
				logger?.info('resolving absolute remote file', args.path)

				// Get remote file
				const response = await fetch(args.path)
				const loader = getLoader(args.path, response)

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
			})

			// Resolve relative remote assets
			build.onResolve({ filter: /.*/, namespace: 'remote' }, async (args) => {
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

					logger?.info(
						`resolving relative remote asset from (${importerUrl.href})`,
						args.path,
					)

					// Resolve remote asset
					const response = await fetch(url)
					const assetFilePath = await cacheAssetFile(assetDir, response)
					const loader = getLoader(url.pathname)
					const assetFile = await assetNaming?.(assetFilePath) ?? assetFilePath

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
			})

			// Load cache files (css)
			build.onLoad({ filter: /.*/, namespace: 'remote' }, async (args) => {
				logger?.info('loading cached file', args.path)
				const contents = await Deno.readFile(args.path)
				return { contents, loader: args.pluginData.loader }
			})
		},
	}
}