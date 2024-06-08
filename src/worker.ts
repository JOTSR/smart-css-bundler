/// <reference lib="webworker" />

// import { ensureDir } from '@std/fs'
import { ensureDir } from 'jsr:@std/fs@^0.229.1'
import { Logger } from './helpers.ts'
// import { fromFileUrl } from '@std/path'
import { fromFileUrl } from 'jsr:@std/path@^0.225.1'
import { buildCss } from './builder.ts'
import { cacheAssets } from './assets.ts'

async function bundle(
	sourceFile: string,
	cacheDir: string,
	dev: boolean,
	logger: Logger,
) {
	const t = setTimeout(() => {}, 36_000_000) // Prevent lightningcss from exiting event loop
	await ensureDir(fromFileUrl(cacheDir))

	const result = await buildCss(sourceFile, fromFileUrl(cacheDir), dev, logger)
	console.assert(true) // Prevent lightningcss from dropping promise

	await cacheAssets(cacheDir)
	console.assert(true) // Prevent lightningcss from dropping promise

	clearTimeout(t)
	return result
}

self.addEventListener(
	'message',
	async (
		event: MessageEvent<
			{ sourcefile: string; cacheDir: string; dev: boolean; logger: Logger }
		>,
	) => {
		const { sourcefile, cacheDir, dev } = event.data
		
		// Transfert logger from worker
		const logger = new Logger(event.data.logger)

		const result = await bundle(sourcefile, cacheDir, dev, logger)

		self.postMessage(result)
	},
)

self.addEventListener('close', () => {
	throw new Error()
})
