import type { StorybookConfig } from '@storybook/react-vite'
import type { PluginOption } from 'vite'

/** True for any plugin `vite-plugin-pwa` registers (they are all named `vite-plugin-pwa*`). */
function isPwaPlugin(plugin: PluginOption): boolean {
  return Boolean(
    plugin &&
    typeof plugin === 'object' &&
    'name' in plugin &&
    typeof plugin.name === 'string' &&
    plugin.name.startsWith('vite-plugin-pwa')
  )
}

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-mcp',
  ],
  framework: '@storybook/react-vite',
  // The app's vite.config.ts is inherited, including the PWA plugin. Storybook must
  // not ship the app's service worker, and the plugin fails the build trying to
  // precache Storybook's multi-megabyte runtime.
  viteFinal(viteConfig) {
    viteConfig.plugins = (viteConfig.plugins ?? [])
      .flat(Infinity as 1)
      .filter((p) => !isPwaPlugin(p))
    return viteConfig
  },
}
export default config
