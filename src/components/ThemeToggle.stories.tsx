import type { Meta, StoryObj } from '@storybook/react-vite'
import { within } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { expect } from 'vitest'
import { ThemeToggle } from './ThemeToggle'
import { ThemeProvider } from '../contexts/ThemeContext'

const meta: Meta<typeof ThemeToggle> = {
  title: 'UI/ThemeToggle',
  component: ThemeToggle,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div className="p-10 bg-space-950 min-h-[100px] flex items-center justify-center">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof ThemeToggle>

export const Default: Story = {}

export const ToggleThemeInteraction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button')
    await expect(button).toBeDefined()
    const initialPressed = button.getAttribute('aria-pressed')
    await userEvent.click(button)
    expect(button.getAttribute('aria-pressed')).not.toBe(initialPressed)
  },
}
