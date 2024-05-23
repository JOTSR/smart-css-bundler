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
		const css = await bundleWorker(sourcefile, cacheDir, dev, logger)

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

function initBundleWorker() {
	return new Worker(import.meta.resolve('./worker.ts'), { type: 'module' })
}

function bundleWorker(
	sourcefile: string,
	cacheDir: string,
	dev: boolean,
	logger: Logger,
): Promise<string> {
	const { promise, resolve, reject } = Promise.withResolvers<string>()

	let worker = initBundleWorker()

	worker.postMessage({ sourcefile, cacheDir, dev, logger })

	let isDown = false

	const maxRevives = 10
	const maxKills = 3

	let revives = 0
	let kills = 0

	const revive = setInterval(() => {
		if (isDown) {
			if (revives > maxRevives) {
				clearInterval(revive)
				clearInterval(kill)

				reject(new Error('max retry reached'))
			}

			revives++
			worker = initBundleWorker()
			worker.postMessage({ sourcefile, cacheDir })
		}
	}, 500)

	const kill = setInterval(() => {
		if (kills > maxKills) {
			clearInterval(revive)
			clearInterval(kill)

			reject(new Error('max retry reached'))
		}

		kills++
		revives = 0
		worker.terminate()
		isDown = true
	}, 2_000)

	worker.addEventListener('message', (event: MessageEvent<string>) => {
		worker.terminate()
		clearInterval(revive)
		clearInterval(kill)
		resolve(event.data)
	})

	worker.addEventListener('error', () => {
		isDown = true
		worker.terminate()
	})

	return promise
}
