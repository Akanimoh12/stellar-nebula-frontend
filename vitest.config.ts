import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@store': resolve(__dirname, 'src/store'),
      '@types': resolve(__dirname, 'src/types'),
      '@constants': resolve(__dirname, 'src/constants'),
      '@config': resolve(__dirname, 'src/config'),
      '@services': resolve(__dirname, 'src/services'),
      '@assets': resolve(__dirname, 'src/assets'),
    },
  },
  test: {
    exclude: [...configDefaults.exclude, 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/**/*.d.ts', 'src/main.tsx'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          exclude: ['src/__tests__/integration/**', 'e2e/**'],
          environment: 'happy-dom',
          globals: true,
          setupFiles: ['./src/test/setup.ts'],
          testTimeout: 15000,
          include: ['src/**/*.{test,spec}.{ts,tsx}', 'test/**/*.{test,spec}.{ts,tsx}'],
          exclude: [...configDefaults.exclude, 'e2e/**', 'src/**/*.stories.{ts,tsx}'],
          // Automatically restore mocks, stubs, and environment between tests
          // so leftover state from one test never leaks into another (#421).
          restoreMocks: true,
          clearMocks: true,
          unstubEnvs: true,
          unstubGlobals: true,
          // `src/config/env.ts` validates these at import time, so without them any
          // suite that imports the API client fails to load. Non-secret test values;
          // tests that exercise validation stub their own.
          env: {
            VITE_STELLAR_RPC_URL: 'https://soroban-testnet.stellar.org',
            VITE_STELLAR_HORIZON_URL: 'https://horizon-testnet.stellar.org',
            VITE_STELLAR_PASSPHRASE: 'Test SDF Network ; September 2015',
            VITE_NEBULA_CONTRACT_ID: 'CTEST_NEBULA',
            VITE_TOKEN_CONTRACT_ID: 'CTEST_TOKEN',
            VITE_API_BASE_URL: 'https://api.test',
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['src/__tests__/integration/**/*.{test,spec}.{ts,tsx}'],
          environment: 'happy-dom',
          globals: true,
          setupFiles: ['./src/test/setup.ts'],
          testTimeout: 20000,
          env: {
            VITE_STELLAR_RPC_URL: 'https://soroban-testnet.stellar.org',
            VITE_STELLAR_HORIZON_URL: 'https://horizon-testnet.stellar.org',
            VITE_STELLAR_PASSPHRASE: 'Test SDF Network ; September 2015',
            VITE_NEBULA_CONTRACT_ID: 'CTEST_NEBULA',
            VITE_TOKEN_CONTRACT_ID: 'CTEST_TOKEN',
            VITE_API_BASE_URL: 'https://api.test',
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'performance',
          include: ['test/performance/**/*.{test,spec}.{ts,tsx}'],
          environment: 'happy-dom',
          globals: true,
          setupFiles: ['./src/test/setup.ts'],
          testTimeout: 15000,
          env: {
            VITE_STELLAR_RPC_URL: 'https://soroban-testnet.stellar.org',
            VITE_STELLAR_HORIZON_URL: 'https://horizon-testnet.stellar.org',
            VITE_STELLAR_PASSPHRASE: 'Test SDF Network ; September 2015',
            VITE_NEBULA_CONTRACT_ID: 'CTEST_NEBULA',
            VITE_TOKEN_CONTRACT_ID: 'CTEST_TOKEN',
            VITE_API_BASE_URL: 'https://api.test',
          },
        },
      },
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [
              {
                browser: 'chromium',
              },
            ],
          },
          setupFiles: ['./.storybook/vitest.setup.ts'],
        },
      },
    ],
  },
})
