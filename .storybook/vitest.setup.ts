import { beforeAll } from 'vitest'
import { setProjectAnnotations } from '@storybook/react-vite'
import * as projectAnnotations from './preview'

// Apply Storybook project annotations (decorators, parameters, globals) to all stories during Vitest execution (#424)
const project = setProjectAnnotations([
  projectAnnotations.default ?? projectAnnotations,
])

beforeAll(project.beforeAll)
