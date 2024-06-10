import { parse } from '@std/path'

/**
 * Determine esbuild loader to use for specified remote or cached file.
 *
 * @param filepath File to get loader from
 * @param response Fetched file headers
 * @returns esbuild loader
 */
export function getLoader(
	filepath: string,
	response?: Response,
): 'css' | 'file' {
	if (response?.headers?.get('Content-Type') === 'text/css; charset=utf-8') {
		return 'css'
	}

	const pathname = new URL(filepath, 'file://').pathname
	const { ext } = parse(pathname)
	if (ext === '.css') {
		return 'css'
	}

	return 'file'
}
