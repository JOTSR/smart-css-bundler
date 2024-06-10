import { ensureDir } from '@std/fs'
import { join, parse } from '@std/path'
import { build } from 'esbuild'
import { Logger } from '../utils.ts'
import { remoteResolver } from './remote_resolver.ts'

/** Bundler options */
export type BundleOptions = {
	/** CSS bundle output directory. */
	bundleDir: string
	/** Rename css bundle output with custom attributes. */
	bundleNaming?: (bundleName: string) => string | Promise<string>

	/** Remote css cache directory. */
	cacheDir: string

	/** Static assets output directory. */
	assetDir: string
	/** Rename static assets with custom attributes. */
	assetNaming?: (assetName: string) => string | Promise<string>

	/** Enable sourcemap and file watcher. */
	dev: boolean
	/** Set custom logger. */
	logger?: Logger
}

/**
 * Bundle entryPoints files into bundle dir.
 * Cache remote assets in cacheDir and assets in assetDir.
 *
 * @param entryPoints Files to bundle
 * @param options Bundler options
 */
export async function bundle(
	entryPoints: string[],
	{ bundleDir, cacheDir, assetDir, ...options }: BundleOptions,
) {
	// Ensure outputs directories
	await ensureDir(bundleDir)
	await ensureDir(cacheDir)
	await ensureDir(assetDir)

	// Start parallel bundler for each entryPoint
	const bundles = entryPoints.map((entryPoint) =>
		bundleEntrypoint(entryPoint, { bundleDir, cacheDir, assetDir, ...options })
	)

	// Wait for all bundle to finish
	return Promise.all(bundles)
}

/**
 * Bundle a single entryPoint into a single bundled file.
 *
 * @param entryPoint File to bundle
 * @param options Bundler options
 * @returns esbuild result
 */
async function bundleEntrypoint(
	entryPoint: string,
	{
		bundleDir,
		bundleNaming,
		cacheDir,
		assetDir,
		assetNaming,
		dev = false,
		logger,
	}: BundleOptions,
) {
	const { base } = parse(entryPoint)
	const outfile = join(bundleDir, base)

	return build({
		entryPoints: [entryPoint],
		minify: true,
		bundle: true,
		sourcemap: dev ? 'inline' : undefined,
		outfile: await bundleNaming?.(outfile) ?? outfile,
		plugins: [remoteResolver({ cacheDir, assetDir, assetNaming, dev, logger })],
	})
}