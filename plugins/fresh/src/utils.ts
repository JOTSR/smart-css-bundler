import { join } from '@std/path'

/**
 * Get fresh static build directory.
 *
 * @param outDir Bundle and asset output directory
 * @returns Fresh build static directory
 */
export function freshBuildDir(
	{ outDir }: { outDir: string },
	subDir: string,
): string {
	return join(outDir, '/static', subDir)
}
