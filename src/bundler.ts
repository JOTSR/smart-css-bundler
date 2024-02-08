import { fromFileUrl, join } from '../deps.ts'
import { builder } from './builder.ts'
import { cssImports, Logger, uInt8ArrayConcat } from './helpers.ts'

export async function bundleCss(
	sourceDir: string,
	assetDir: string,
	pathname: string,
	dev: boolean,
	logger: Logger,
) {
	const filename = fromFileUrl(join(sourceDir, pathname))
	logger.info('bundling', filename)

	//prevent Deno from exiting before bundle
	setTimeout(() => {}, 3_000)

	try {
		const { code, map } = await builder({ filename, dev, assetDir, logger })

		if (map) {
			const sourceMappingURL = new TextEncoder().encode(
				`\n/*# sourceMappingURL=${pathname.replace('.css', '.map.css')} */`,
			)
			await Deno.writeFile(
				join(assetDir, pathname),
				uInt8ArrayConcat(code, sourceMappingURL),
			)

			await Deno.writeFile(
				join(assetDir, pathname.replace('.css', '.map.css')),
				map,
			)
		} else {
			await Deno.writeFile(join(assetDir, pathname), code)
		}
	} catch (error) {
		logger.error('error during bundle, cleaning cache', error)
		cssImports.clear()
	}
}
