import { createSignal, createEffect, onMount, For, Show } from "solid-js"
import { useInput } from "../hooks/useInput"
import fuzzysort from "fuzzysort"
import * as R from "remeda"
import { Dialog } from "./Dialog"
import { useTheme, selectedForeground } from "../context/ThemeContext"
import { truncate } from "../lib/locale"
import { KEYS } from "../lib/constants"

export interface DialogSelectOption {
  title: string
  value: string
  description?: string
  footer?: string
  category?: string
  disabled?: boolean
  onSelect?: () => void
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
  keybinds?: Record<string, string>
  onClose: () => void
}

export function DialogSelect(props: DialogSelectProps) {
  const { theme } = useTheme()
  const [search, setSearch] = createSignal("")
  const [filteredOptions, setFilteredOptions] = createSignal<DialogSelectOption[]>([])
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  const [viewportStart, setViewportStart] = createSignal(0)
  
  // Calculate viewport height based on available space minus header/footer
  // Dialog default height is 10, content padding is 1
  // Header takes 2 lines, Footer takes 1 line, Search takes 1 line + 1 margin
  // Remaining for list: ~4 lines. This might need adjustment based on dialog height prop.
  // We'll hardcode 6 for now as a reasonable default for list items in standard dialog
  const ITEMS_PER_PAGE = 6

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
    setViewportStart(0)
  })

  // Handle keyboard input
  useInput((input, key) => {
    // Escape handled by Dialog backdrop/onClose
    if (key.name === "escape") {
      // props.onClose() - handled by Dialog
      return
    }

    if (key.name === "return" || key.name === "enter") {
      const selected = filteredOptions()[selectedIndex()]
      if (selected && !selected.disabled) {
        if (selected.onSelect) selected.onSelect()
        if (props.onSelect) props.onSelect(selected)
      }
      return
    }

    if (key.name === "up" || (input === KEYS.CTRL_P)) {
      setSelectedIndex(Math.max(0, selectedIndex() - 1))
      // Scroll up if needed
      if (selectedIndex() < viewportStart()) {
        setViewportStart(selectedIndex())
      }
      if (props.onMove) props.onMove(filteredOptions()[selectedIndex()])
    }

    if (key.name === "down" || (input === KEYS.CTRL_N)) {
      setSelectedIndex(Math.min(filteredOptions().length - 1, selectedIndex() + 1))
      // Scroll down if needed
      if (selectedIndex() >= viewportStart() + ITEMS_PER_PAGE) {
        setViewportStart(selectedIndex() - ITEMS_PER_PAGE + 1)
      }
      if (props.onMove) props.onMove(filteredOptions()[selectedIndex()])
    }

    if (key.name === "pageup") {
      const newIndex = Math.max(0, selectedIndex() - ITEMS_PER_PAGE)
      setSelectedIndex(newIndex)
      if (newIndex < viewportStart()) {
        setViewportStart(newIndex)
      }
    }

    if (key.name === "pagedown") {
      const newIndex = Math.min(filteredOptions().length - 1, selectedIndex() + ITEMS_PER_PAGE)
      setSelectedIndex(newIndex)
      if (newIndex >= viewportStart() + ITEMS_PER_PAGE) {
        setViewportStart(newIndex - ITEMS_PER_PAGE + 1)
      }
    }

    // Search input handling
    if (!key.ctrl && !key.meta && input.length === 1) {
      setSearch(s => s + input)
    }
    if (key.name === "backspace") {
      setSearch(s => s.slice(0, -1))
    }
  })

  // Group options by category for rendering
  // Note: we just render flat list but could add headers visually
  // To keep it simple and consistent with cursor/vscode, we'll just show category in the item
  
  // Calculate visible items
  const visibleItems = () => {
    return filteredOptions().slice(viewportStart(), viewportStart() + ITEMS_PER_PAGE)
  }

  return (
    <Dialog 
      onClose={props.onClose} 
      width={60} 
      height={14} // Increased height for list
    >
      {/* Header */}
      <box style={{ width: "100%", justifyContent: "space-between", marginBottom: 1 }}>
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
        borderStyle: "rounded", 
        borderColor: theme().border,
        paddingLeft: 1,
        marginBottom: 1
      }}>
        <text>
          <span>{search() || props.placeholder || "Search..."}</span>
          {/* Cursor */}
          <span style={{ fg: theme().primary }}>_</span> 
        </text>
      </box>

      {/* List */}
      <box style={{ flexDirection: "column", flexGrow: 1 }}>
        <Show when={filteredOptions().length > 0} fallback={
          <text>
             <span style={{ fg: theme().textMuted }}>No results found</span>
          </text>
        }>
          <For each={visibleItems()}>
            {(option, i) => {
              const index = () => viewportStart() + i()
              const isSelected = () => index() === selectedIndex()
              
              return (
                <box
                  onMouseUp={() => {
                    if (!option.disabled) {
                      if (option.onSelect) option.onSelect()
                      if (props.onSelect) props.onSelect(option)
                    }
                  }}
                  style={{
                    width: "100%",
                    paddingLeft: 1,
                    paddingRight: 1,
                    backgroundColor: isSelected() ? theme().primary : undefined,
                  }}
                >
                  <box style={{ width: "100%", justifyContent: "space-between" }}>
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
        </Show>
      </box>

      {/* Footer / Keybinds */}
      <box style={{ width: "100%", marginTop: 1, gap: 2 }}>
        <For each={Object.entries(props.keybinds || {})}>
          {([label, key]) => (
            <text>
              <span style={{ bold: true }}>{label}</span> {key}
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
