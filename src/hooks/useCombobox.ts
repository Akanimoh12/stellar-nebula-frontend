import { useState, useCallback, useRef, useEffect, useId } from 'react'
import type React from 'react'

export interface ComboboxOption<T extends string = string> {
  value: T
  label: string
  disabled?: boolean
  description?: string
}

export interface UseComboboxOptions<T extends string = string> {
  id?: string
  options: ComboboxOption<T>[]
  value?: T
  defaultValue?: T
  onChange?: (value: T, option: ComboboxOption<T>) => void
  disabled?: boolean
  loop?: boolean
}

export interface ComboboxTriggerProps {
  id: string
  role: 'combobox'
  type: 'button'
  tabIndex: number
  'aria-expanded': boolean
  'aria-haspopup': 'listbox'
  'aria-controls': string
  'aria-activedescendant': string | undefined
  'aria-labelledby': string
  'aria-disabled': boolean | undefined
  disabled: boolean | undefined
  onClick: () => void
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void
}

export interface ComboboxListboxProps {
  id: string
  role: 'listbox'
  tabIndex: -1
  'aria-labelledby': string
}

export interface ComboboxOptionProps {
  id: string
  role: 'option'
  'aria-selected': boolean
  'aria-disabled': boolean | undefined
  'data-highlighted': 'true' | 'false'
  onClick: () => void
  onMouseEnter: () => void
}

export interface UseComboboxReturn<T extends string = string> {
  isOpen: boolean
  selectedValue: T | undefined
  selectedOption: ComboboxOption<T> | undefined
  activeIndex: number
  highlightedOption: ComboboxOption<T> | undefined
  announcement: string
  comboboxId: string
  listboxId: string
  labelId: string
  getOptionId: (index: number) => string
  openMenu: () => void
  closeMenu: () => void
  toggleMenu: () => void
  selectIndex: (index: number) => void
  selectOption: (option: ComboboxOption<T>) => void
  setActiveIndex: (index: number) => void
  handleKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void
  getLabelProps: () => { id: string; htmlFor: string }
  getComboboxProps: () => ComboboxTriggerProps
  getListboxProps: () => ComboboxListboxProps
  getOptionProps: (index: number) => ComboboxOptionProps
}

function findFirstEnabledIndex<T extends string>(options: ComboboxOption<T>[]): number {
  return options.findIndex((opt) => !opt.disabled)
}

function findLastEnabledIndex<T extends string>(options: ComboboxOption<T>[]): number {
  for (let i = options.length - 1; i >= 0; i--) {
    if (!options[i].disabled) return i
  }
  return -1
}

function findNextEnabledIndex<T extends string>(
  options: ComboboxOption<T>[],
  currentIndex: number,
  direction: 1 | -1,
  loop: boolean
): number {
  const count = options.length
  if (count === 0) return -1

  if (currentIndex < 0) {
    return direction === 1 ? findFirstEnabledIndex(options) : findLastEnabledIndex(options)
  }

  let idx = currentIndex
  for (let step = 0; step < count; step++) {
    idx += direction
    if (loop) {
      idx = (idx + count) % count
    } else if (idx < 0 || idx >= count) {
      return currentIndex
    }
    if (!options[idx]?.disabled) {
      return idx
    }
  }

  return currentIndex
}

/**
 * WAI-ARIA 1.2 Combobox pattern hook supporting full keyboard navigation,
 * active descendant management, typeahead search, and screen reader announcements.
 */
export function useCombobox<T extends string = string>({
  id,
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  disabled = false,
  loop = true,
}: UseComboboxOptions<T>): UseComboboxReturn<T> {
  const generatedId = useId()
  const baseId = id ?? `combobox-${generatedId}`
  const comboboxId = baseId
  const listboxId = `${baseId}-listbox`
  const labelId = `${baseId}-label`

  const isControlled = controlledValue !== undefined
  const [uncontrolledValue, setUncontrolledValue] = useState<T | undefined>(defaultValue)
  const selectedValue = isControlled ? controlledValue : uncontrolledValue

  const selectedIndex = options.findIndex((opt) => opt.value === selectedValue)
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined

  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number>(() =>
    selectedIndex >= 0 ? selectedIndex : findFirstEnabledIndex(options)
  )
  const [announcement, setAnnouncement] = useState('')

  const typeaheadBufferRef = useRef('')
  const typeaheadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (typeaheadTimeoutRef.current) {
        clearTimeout(typeaheadTimeoutRef.current)
      }
    }
  }, [])

  const getOptionId = useCallback((index: number) => `${baseId}-option-${index}`, [baseId])

  const openMenu = useCallback(() => {
    if (disabled) return
    setIsOpen(true)
    const initialIdx =
      selectedIndex >= 0 && !options[selectedIndex]?.disabled
        ? selectedIndex
        : findFirstEnabledIndex(options)
    setActiveIndex(initialIdx)
  }, [disabled, options, selectedIndex])

  const closeMenu = useCallback(() => {
    setIsOpen(false)
    if (selectedIndex >= 0) {
      setActiveIndex(selectedIndex)
    }
  }, [selectedIndex])

  const toggleMenu = useCallback(() => {
    if (disabled) return
    if (isOpen) {
      closeMenu()
    } else {
      openMenu()
    }
  }, [disabled, isOpen, closeMenu, openMenu])

  const selectIndex = useCallback(
    (index: number) => {
      if (disabled) return
      const option = options[index]
      if (!option || option.disabled) return

      if (!isControlled) {
        setUncontrolledValue(option.value)
      }
      setActiveIndex(index)
      setIsOpen(false)
      setAnnouncement(`Selected ${option.label}`)
      onChange?.(option.value, option)
    },
    [disabled, isControlled, onChange, options]
  )

  const selectOption = useCallback(
    (option: ComboboxOption<T>) => {
      const idx = options.findIndex((o) => o.value === option.value)
      if (idx >= 0) {
        selectIndex(idx)
      }
    },
    [options, selectIndex]
  )

  const handleTypeahead = useCallback(
    (char: string) => {
      if (typeaheadTimeoutRef.current) {
        clearTimeout(typeaheadTimeoutRef.current)
      }
      typeaheadBufferRef.current += char.toLowerCase()
      typeaheadTimeoutRef.current = setTimeout(() => {
        typeaheadBufferRef.current = ''
      }, 500)

      const query = typeaheadBufferRef.current
      const startIdx = activeIndex >= 0 ? (activeIndex + 1) % options.length : 0
      for (let i = 0; i < options.length; i++) {
        const idx = (startIdx + i) % options.length
        const opt = options[idx]
        if (!opt.disabled && opt.label.toLowerCase().startsWith(query)) {
          setActiveIndex(idx)
          if (!isOpen) {
            setIsOpen(true)
          }
          break
        }
      }
    },
    [activeIndex, isOpen, options]
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (disabled) return

      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault()
          if (!isOpen) {
            openMenu()
          } else {
            setActiveIndex((prev) => findNextEnabledIndex(options, prev, 1, loop))
          }
          break
        }
        case 'ArrowUp': {
          event.preventDefault()
          if (!isOpen) {
            setIsOpen(true)
            const initialIdx =
              selectedIndex >= 0 && !options[selectedIndex]?.disabled
                ? selectedIndex
                : findLastEnabledIndex(options)
            setActiveIndex(initialIdx)
          } else {
            setActiveIndex((prev) => findNextEnabledIndex(options, prev, -1, loop))
          }
          break
        }
        case 'Home': {
          event.preventDefault()
          if (!isOpen) setIsOpen(true)
          setActiveIndex(findFirstEnabledIndex(options))
          break
        }
        case 'End': {
          event.preventDefault()
          if (!isOpen) setIsOpen(true)
          setActiveIndex(findLastEnabledIndex(options))
          break
        }
        case 'PageUp': {
          event.preventDefault()
          if (isOpen) {
            setActiveIndex(findFirstEnabledIndex(options))
          }
          break
        }
        case 'PageDown': {
          event.preventDefault()
          if (isOpen) {
            setActiveIndex(findLastEnabledIndex(options))
          }
          break
        }
        case 'Enter':
        case ' ': {
          event.preventDefault()
          if (!isOpen) {
            openMenu()
          } else if (activeIndex >= 0 && activeIndex < options.length) {
            selectIndex(activeIndex)
          }
          break
        }
        case 'Escape': {
          if (isOpen) {
            event.preventDefault()
            event.stopPropagation()
            closeMenu()
          }
          break
        }
        case 'Tab': {
          if (isOpen) {
            closeMenu()
          }
          break
        }
        default: {
          if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault()
            handleTypeahead(event.key)
          }
          break
        }
      }
    },
    [
      activeIndex,
      closeMenu,
      disabled,
      handleTypeahead,
      isOpen,
      loop,
      openMenu,
      options,
      selectIndex,
      selectedIndex,
    ]
  )

  const highlightedOption =
    activeIndex >= 0 && activeIndex < options.length ? options[activeIndex] : undefined

  const activeDescendantId =
    isOpen && activeIndex >= 0 && activeIndex < options.length
      ? getOptionId(activeIndex)
      : undefined

  const getLabelProps = useCallback(
    () => ({
      id: labelId,
      htmlFor: comboboxId,
    }),
    [comboboxId, labelId]
  )

  const getComboboxProps = useCallback(
    (): ComboboxTriggerProps => ({
      id: comboboxId,
      role: 'combobox',
      type: 'button',
      tabIndex: disabled ? -1 : 0,
      'aria-expanded': isOpen,
      'aria-haspopup': 'listbox',
      'aria-controls': listboxId,
      'aria-activedescendant': activeDescendantId,
      'aria-labelledby': labelId,
      'aria-disabled': disabled ? true : undefined,
      disabled: disabled ? true : undefined,
      onClick: toggleMenu,
      onKeyDown: handleKeyDown,
    }),
    [
      activeDescendantId,
      comboboxId,
      disabled,
      handleKeyDown,
      isOpen,
      labelId,
      listboxId,
      toggleMenu,
    ]
  )

  const getListboxProps = useCallback(
    (): ComboboxListboxProps => ({
      id: listboxId,
      role: 'listbox',
      tabIndex: -1,
      'aria-labelledby': labelId,
    }),
    [labelId, listboxId]
  )

  const getOptionProps = useCallback(
    (index: number): ComboboxOptionProps => {
      const option = options[index]
      const isSelected = option?.value === selectedValue
      const isHighlighted = index === activeIndex
      return {
        id: getOptionId(index),
        role: 'option',
        'aria-selected': isSelected,
        'aria-disabled': option?.disabled ? true : undefined,
        'data-highlighted': isHighlighted ? 'true' : 'false',
        onClick: () => selectIndex(index),
        onMouseEnter: () => {
          if (!option?.disabled) {
            setActiveIndex(index)
          }
        },
      }
    },
    [activeIndex, getOptionId, options, selectIndex, selectedValue]
  )

  return {
    isOpen,
    selectedValue,
    selectedOption,
    activeIndex,
    highlightedOption,
    announcement,
    comboboxId,
    listboxId,
    labelId,
    getOptionId,
    openMenu,
    closeMenu,
    toggleMenu,
    selectIndex,
    selectOption,
    setActiveIndex,
    handleKeyDown,
    getLabelProps,
    getComboboxProps,
    getListboxProps,
    getOptionProps,
  }
}
