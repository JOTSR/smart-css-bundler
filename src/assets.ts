import { ensureFile, walk } from 'jsr:@std/fs@^0.229.1'
import { fromFileUrl, relative, toFileUrl } from 'jsr:@std/path@^0.225.1'
import { type Image, transform } from 'npm:lightningcss@^1.25.0'

async function cacheFile(from: URL, to: string) {
	// Fetch remote file
	const response = await fetch(from)
	const file = response.body

	// console.log(0)

	// Cache remote file
	await ensureFile(to)
	await Deno.writeFile(to, file ?? new Uint8Array())
}

async function cacheUrl(url: string, remoteBaseUrl: string, filename: URL) {
	// Cache url content
	const remoteUrl = new URL(url, remoteBaseUrl)
	const localUrl = new URL(url, filename)

	if (/^((https?)|(file)):\/\//.test(remoteUrl.href)) {
		await cacheFile(remoteUrl, fromFileUrl(localUrl))
	}
}

function cacheImage(remoteBaseUrl: string, filename: URL) {
	return async ({ image }: { image: Image }) => {
		// Cache url content
		if (image.type === 'url') {
			await cacheUrl(image.value.url, remoteBaseUrl, filename)
		}

		// Cache src-set
		if (image.type === 'image-set') {
			await Promise.all(
				image.value.options.map(cacheImage(remoteBaseUrl, filename)),
			)
		}
	}
}

async function cacheAsset(filename: URL, cacheDir: URL) {
	const content = await Deno.readFile(filename)
	const remoteBaseUrl = `https://${relative(cacheDir.href, filename.href)}`

	transform({
		filename: filename.href,
		code: content,
		visitor: {
			Url(url) {
				// Cache url content
				cacheUrl(url.url, remoteBaseUrl, filename)

				return url
			},
			Image(image) {
				// Cache image content
				cacheImage(remoteBaseUrl, filename)({ image })

				return image
			},
		},
	})
}

export async function cacheAssets(cacheDir: string) {
	const cacheDirUrl = new URL(cacheDir)
	const jobs: Promise<void>[] = []

	for await (const entry of walk(cacheDirUrl)) {
		if (entry.isFile && entry.name.endsWith('.css')) {
			const caching = cacheAsset(toFileUrl(entry.path), cacheDirUrl)
			jobs.push(caching)
		}
	}

	return Promise.all(jobs)
}
