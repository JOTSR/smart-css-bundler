/**
 * # Smart css bundle plugin for [deno/fresh](https://fresh.deno.dev)
 *
 * Bundle local and remote css files into a single bundle.
 *
 * Cache remote css locally and save remote assets to a specified static directory.
 *
 * ## Fresh plugin
 *
 * Fresh plugin that local and remote bundle css to a single minified local file.
 *
 * @module
 */
export { cssBundler } from './src/plugin.ts'
