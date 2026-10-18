import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/**
 * MSW Server instance for intercepting API requests in Node / Vitest tests.
 */
export const server = setupServer(...handlers)
