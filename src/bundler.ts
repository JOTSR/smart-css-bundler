import { buildCss } from './builder.ts'
import { Logger } from './helpers.ts'

export async function bundleCss(
	sourcefile: string,
	outfile: string,
	cacheDir: string,
	dev: boolean,
	logger: Logger,
): Promise<void> {
	logger.info(`bundling ${sourcefile} into ${outfile}`, sourcefile)

	try {
		const css = await buildCss(sourcefile, cacheDir, dev, logger)

		try {
			await Deno.writeTextFile(outfile, css)
		} catch (error) {
			logger.error(`error during writing bundle`, error)
			throw new Error(
				`error during writing bundle of ${sourcefile} into ${outfile}`,
				{ cause: error },
			)
		}
	} catch (error) {
		logger.error('error during bundle', error)
		throw new Error(`error during bundle ${sourcefile} into ${outfile}`, {
			cause: error,
		})
	}
}
