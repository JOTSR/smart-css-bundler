import { join, parse } from '@std/path'
import { ensureDir } from '@std/fs'

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
	const cacheParentDir = parse(filepath).dir

	await ensureDir(cacheParentDir)
	await Deno.writeFile(filepath, response.body ?? new Uint8Array())
}
