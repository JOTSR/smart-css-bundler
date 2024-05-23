import { Logger } from './helpers.ts'

function isWrite({ kind }: Deno.FsEvent) {
	if (kind === 'create') return true
	if (kind === 'modify') return true
	if (kind === 'remove') return true
	return false
}

export class Watcher {
	#watcher: Deno.FsWatcher

	#tracked: Set<string> = new Set()

	#logger: Logger

	#isTracked(path: string) {
		const tracked = Array.from(this.#tracked)
		return tracked.includes(path)
	}

	constructor(root: string, logger: Logger) {
		this.#watcher = Deno.watchFs(root)
		this.#logger = logger
	}

	track(path: string) {
		this.#tracked.add(path)
	}

	async watch(cb: (path: string) => void | Promise<void>) {
		for await (const event of this.#watcher) {
			if (isWrite(event)) {
				this.#logger.info(JSON.stringify(event, null, '\t'))
				console.log(event)

				const cbs = event.paths.filter(this.#isTracked).map(cb)

				try {
					await Promise.all(cbs)
					this.#logger.info('cb ok')
				} catch (error) {
					this.#logger.error(error)
				}
			}
		}
	}

	[Symbol.dispose]() {
		this.#watcher.close()
	}
}
