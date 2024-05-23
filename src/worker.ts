/// <reference lib="webworker" />

import { ensureDir } from '@std/fs'
import { Logger } from './helpers.ts'
import { fromFileUrl } from '@std/path'
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
			{ sourceFile: string; cacheDir: string; dev: boolean; logger: Logger }
		>,
	) => {
		const { sourceFile, cacheDir, dev, logger } = event.data

		const result = await bundle(sourceFile, cacheDir, dev, logger)

		self.postMessage(result)
	},
)

self.addEventListener('close', () => {
	throw new Error()
})
