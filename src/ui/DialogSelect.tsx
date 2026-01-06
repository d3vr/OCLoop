import { createSignal, createEffect, onMount, For, Show } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import type { InputRenderable } from "@opentui/core"
import fuzzysort from "fuzzysort"
import { ScrollBoxRenderable } from "@opentui/core"
import { Dialog } from "./Dialog"
import { useTheme, selectedForeground } from "../context/ThemeContext"
import { truncate } from "../lib/locale"

export interface DialogSelectOption {
  title: string
  value: string
  description?: string
  footer?: string
  category?: string
  disabled?: boolean
  onSelect?: () => void
}

export interface DialogKeybind {
  label: string
  key: string
  onSelect?: () => void
  bind?: string | string[]
}

export interface DialogSelectProps {
  title: string
  placeholder?: string
  options: DialogSelectOption[]
  onSelect?: (option: DialogSelectOption) => void
  onMove?: (option: DialogSelectOption | null) => void
  onFilter?: (filtered: DialogSelectOption[]) => void
  skipFilter?: boolean
  current?: string
  keybinds?: DialogKeybind[]
  onClose: () => void
}

export function DialogSelect(props: DialogSelectProps) {
  const { theme } = useTheme()
  const [search, setSearch] = createSignal("")
  const [filteredOptions, setFilteredOptions] = createSignal<DialogSelectOption[]>([])
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  let scroll: ScrollBoxRenderable | undefined

  let input: InputRenderable | undefined

  onMount(() => {
    setTimeout(() => input?.focus(), 10)
  })

  // Filter options when search changes
  createEffect(() => {
    const query = search()
    
    if (props.skipFilter || !query) {
      setFilteredOptions(props.options)
      if (props.onFilter) props.onFilter(props.options)
    } else {
      const results = fuzzysort.go(query, props.options, {
        keys: ["title", "category"],
        threshold: -10000,
      })
      
      const filtered = results.map(r => r.obj)
      setFilteredOptions(filtered)
      if (props.onFilter) props.onFilter(filtered)
    }
    
    setSelectedIndex(0)
    scroll?.scrollTo({ x: 0, y: 0 })
  })

  const moveTo = (index: number) => {
    setSelectedIndex(index)
    if (props.onMove) props.onMove(filteredOptions()[index])

    const selectedOption = filteredOptions()[index]
    if (!selectedOption || !scroll) return

    const child = scroll.getChildren().find((c: any) => c.id === selectedOption.value)
    
    if (child) {
      const relativeY = child.y - scroll.y
      const height = scroll.height
      
      if (relativeY < 0) {
        scroll.scrollBy({ x: 0, y: relativeY })
      } else if (relativeY >= height) {
        scroll.scrollBy({ x: 0, y: relativeY - height + 1 })
      }
    }
  }

  // Handle keyboard input
  useKeyboard((key) => {
    // Escape handled by Dialog backdrop/onClose
    if (key.name === "escape") {
      key.preventDefault()
      props.onClose()
      return
    }

    if (key.name === "return") {
      key.preventDefault()
      const selected = filteredOptions()[selectedIndex()]
      if (selected && !selected.disabled) {
        if (selected.onSelect) selected.onSelect()
        if (props.onSelect) props.onSelect(selected)
      }
      return
    }

    if (key.name === "up" || (key.ctrl && key.name === "p")) {
      key.preventDefault()
      const newIndex = Math.max(0, selectedIndex() - 1)
      moveTo(newIndex)
      return
    }

    if (key.name === "down" || (key.ctrl && key.name === "n")) {
      key.preventDefault()
      const newIndex = Math.min(filteredOptions().length - 1, selectedIndex() + 1)
      moveTo(newIndex)
      return
    }

    if (key.name === "pageup") {
      key.preventDefault()
      const newIndex = Math.max(0, selectedIndex() - 6)
      moveTo(newIndex)
      return
    }

    if (key.name === "pagedown") {
      key.preventDefault()
      const newIndex = Math.min(filteredOptions().length - 1, selectedIndex() + 6)
      moveTo(newIndex)
      return
    }

    // Check custom keybinds
    if (props.keybinds) {
      // Logic: Only check binds if it's NOT a regular typing character
      // Regular typing: no modifiers, single char, printable range
      const isTyping = !key.ctrl && !key.meta && key.sequence && key.sequence.length === 1 && 
                       key.sequence.charCodeAt(0) >= 32 && key.sequence.charCodeAt(0) <= 126

      if (!isTyping) {
        for (const kb of props.keybinds) {
          if (kb.onSelect && kb.bind) {
            const binds = Array.isArray(kb.bind) ? kb.bind : [kb.bind]
            if (binds.some(b => b === key.sequence || b === key.name)) {
              key.preventDefault()
              kb.onSelect()
              return
            }
          }
        }
      }
    }
  })



  return (
    <Dialog 
      onClose={props.onClose} 
      width={60} 
      height={14}
    >
      {/* Header */}
      <box style={{ width: "100%", justifyContent: "space-between", marginBottom: 1, flexDirection: "row" }}>
        <text>
          <span style={{ bold: true, fg: theme().text }}>{props.title}</span>
        </text>
        <text>
          <span style={{ fg: theme().textMuted }}>esc</span>
        </text>
      </box>

      {/* Search Input */}
      <box style={{ 
        width: "100%", 
        paddingTop: 1, 
        paddingBottom: 1,
        marginBottom: 1
      }}>
        <input
          ref={input}
          value={search()}
          onInput={(v) => setSearch(v)}
          placeholder={props.placeholder || "Search..."}
          focusedBackgroundColor={theme().backgroundPanel}
          cursorColor={theme().primary}
          focusedTextColor={theme().textMuted}
          width="100%"
        />
      </box>

      {/* List */}
      <Show when={filteredOptions().length > 0} fallback={
        <text>
           <span style={{ fg: theme().textMuted }}>No results found</span>
        </text>
      }>
        <scrollbox
          ref={(r) => scroll = r}
          maxHeight={6}
          scrollbarOptions={{ visible: false }}
          style={{ flexDirection: "column", flexGrow: 1 }}
        >
          <For each={filteredOptions()}>
            {(option, i) => {
              const isSelected = () => i() === selectedIndex()
              
              return (
                <box
                  id={option.value}
                  onMouseUp={() => {
                    if (!option.disabled) {
                      if (option.onSelect) option.onSelect()
                      if (props.onSelect) props.onSelect(option)
                    }
                  }}
                  style={{
                    width: "100%",
                    height: 1,
                    paddingLeft: 1,
                    paddingRight: 1,
                    backgroundColor: isSelected() ? theme().primary : undefined,
                  }}
                >
                  <box style={{ width: "100%", justifyContent: "space-between", flexDirection: "row" }}>
                    <text>
                      <span style={{ 
                        fg: isSelected() ? selectedForeground(theme()) : theme().text 
                      }}>
                        {/* Current indicator */}
                        {option.value === props.current ? "● " : "  "}
                        {truncate(option.title, 40)}
                      </span>
                    </text>
                    
                    <Show when={option.category}>
                      <text>
                        <span style={{ 
                          fg: isSelected() ? selectedForeground(theme()) : theme().textMuted 
                        }}>
                          {option.category}
                        </span>
                      </text>
                    </Show>
                  </box>
                </box>
              )
            }}
          </For>
        </scrollbox>
      </Show>

      {/* Footer / Keybinds */}
      <box style={{ width: "100%", marginTop: 1, gap: 2, flexDirection: "row" }}>
        <For each={props.keybinds || []}>
          {(kb) => (
            <text>
              <span style={{ bold: true }}>{kb.label}</span> {kb.key}
            </text>
          )}
        </For>
        {/* Selected item footer info if available */}
        <Show when={filteredOptions()[selectedIndex()]?.footer}>
           <text>
             <span style={{ fg: theme().textMuted }}>
               {filteredOptions()[selectedIndex()]!.footer}
             </span>
           </text>
        </Show>
      </box>
    </Dialog>
  )
}
