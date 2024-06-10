import { ensureDir, exists } from '@std/fs'
import { join, parse } from '@std/path'

/**
 * Cache an asset and return it's base path.
 *
 * @param assetDir Asset output directory
 * @param response Remote fetch response
 * @returns Cached asset base path
 */
export async function cacheAssetFile(
	assetDir: string,
	response: Response,
): Promise<string> {
	const { base } = parse(new URL(response.url).pathname)
	const assetFilePath = join(assetDir, base)

	await cacheFile(assetFilePath, response)

	return base
}

/**
 * Cache a css file and return it's full path.
 *
 * @param cacheDir Cache output directory
 * @param response Remote fetch response
 * @returns Cached css full path
 */
export async function cacheRemoteFile(
	cacheDir: string,
	response: Response,
): Promise<string> {
	const { protocol, host, pathname } = new URL(response.url)
	const cacheFilePath = join(cacheDir, protocol.slice(0, -1), host, pathname)

	await cacheFile(cacheFilePath, response)

	return cacheFilePath
}

/**
 * Cache a file to a local path.
 *
 * @param filepath Local destination file path
 * @param response Fetched source response
 */
async function cacheFile(filepath: string, response: Response): Promise<void> {
	const etag = response.headers.get('etag')

	// Shortcut unchanged cached files
	if (sessionStorage.getItem(filepath) === etag) {
		// Check if file not removed
		if (await exists(filepath)) {
			return
		}
	}

	// Update "fs cache" cache state
	if (etag) {
		sessionStorage.setItem(filepath, etag)
	}

	const cacheParentDir = parse(filepath).dir

	await ensureDir(cacheParentDir)
	await Deno.writeFile(filepath, response.body ?? new Uint8Array())
}
