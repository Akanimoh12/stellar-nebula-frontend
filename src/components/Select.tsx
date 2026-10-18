import { useEffect, useRef } from 'react'
import { useCombobox, type ComboboxOption } from '@/hooks/useCombobox'

export type SelectOption<T extends string = string> = ComboboxOption<T>

export interface SelectProps<T extends string = string> {
  id?: string
  label: string
  options: SelectOption<T>[]
  value?: T
  defaultValue?: T
  onChange?: (value: T, option: SelectOption<T>) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  helperText?: string
  required?: boolean
  name?: string
  className?: string
  hideLabel?: boolean
}

/**
 * Accessible custom Select component implementing the WAI-ARIA 1.2 Combobox pattern.
 * Supports full keyboard navigation (ArrowDown, ArrowUp, Home, End, Enter, Space, Escape, Tab, typeahead),
 * active descendant focus tracking, screen reader selection announcements, and >=44x44px touch targets.
 */
export function Select<T extends string = string>({
  id,
  label,
  options,
  value,
  defaultValue,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  error,
  helperText,
  required = false,
  name,
  className = '',
  hideLabel = false,
}: SelectProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const {
    isOpen,
    selectedOption,
    activeIndex,
    announcement,
    comboboxId,
    closeMenu,
    getLabelProps,
    getComboboxProps,
    getListboxProps,
    getOptionProps,
  } = useCombobox<T>({
    id,
    options,
    value,
    defaultValue,
    onChange: (nextVal, nextOpt) => {
      onChange?.(nextVal, nextOpt)
      triggerRef.current?.focus()
    },
    disabled,
  })

  // Close dropdown when clicking outside the component
  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeMenu()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [isOpen, closeMenu])

  const comboboxProps = getComboboxProps()
  const listboxProps = getListboxProps()
  const labelProps = getLabelProps()
  const errorId = error ? `${comboboxId}-error` : undefined
  const helperId = helperText ? `${comboboxId}-helper` : undefined
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined

  return (
    <div ref={containerRef} className={`custom-select-field relative ${className}`.trim()}>
      <label
        id={labelProps.id}
        htmlFor={labelProps.htmlFor}
        className={
          hideLabel ? 'sr-only' : 'settings-label block text-sm font-medium text-space-100 mb-1'
        }
      >
        {label}
        {required && (
          <span aria-hidden="true" className="text-rose-400 ml-1">
            *
          </span>
        )}
      </label>

      {name && <input type="hidden" name={name} value={selectedOption?.value ?? ''} />}

      <button
        ref={triggerRef}
        {...comboboxProps}
        role="combobox"
        aria-expanded={comboboxProps['aria-expanded']}
        aria-controls={comboboxProps['aria-controls']}
        aria-required={required ? true : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`settings-select custom-select-trigger w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-space-900 border text-left text-white transition-colors min-h-[44px] min-w-[44px] ${
          error
            ? 'border-rose-500 focus-visible:border-rose-400'
            : 'border-space-700 hover:border-space-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        style={{
          minHeight: '44px',
          minWidth: '44px',
        }}
      >
        <span className={selectedOption ? 'text-white' : 'text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-5 w-5 text-cosmic-cyan transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <ul
        {...listboxProps}
        hidden={!isOpen}
        className={`custom-select-listbox absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg bg-space-900 border border-space-700 py-1 shadow-cosmic ${
          isOpen ? 'block' : 'hidden'
        }`}
      >
        {options.map((option, index) => {
          const optionProps = getOptionProps(index)
          const isSelected = optionProps['aria-selected']
          const isHighlighted = index === activeIndex

          return (
            <li
              key={option.value}
              {...optionProps}
              className={`custom-select-option flex items-center justify-between px-3 py-2.5 text-sm select-none min-h-[44px] ${
                option.disabled
                  ? 'opacity-40 cursor-not-allowed text-gray-500'
                  : 'cursor-pointer text-white'
              } ${isHighlighted ? 'bg-space-700 text-cosmic-cyan' : ''} ${
                isSelected ? 'font-semibold' : 'font-normal'
              }`}
              style={{
                minHeight: '44px',
              }}
            >
              <div className="flex flex-col">
                <span>{option.label}</span>
                {option.description && (
                  <span className="text-xs text-gray-400">{option.description}</span>
                )}
              </div>
              {isSelected && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4 text-nebula-core shrink-0"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </li>
          )
        })}
      </ul>

      {helperText && !error && (
        <p id={helperId} className="mt-1 text-xs text-gray-400">
          {helperText}
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-rose-400">
          {error}
        </p>
      )}

      {/* Live region announcing selection changes for screen readers */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  )
}

export default Select
