import { onMount, onCleanup } from "solid-js"
import { useRenderer } from "@opentui/solid"

export interface Key {
  name?: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  sequence: string
}

export function useInput(handler: (input: string, key: Key) => void) {
  const renderer = useRenderer()

  onMount(() => {
    const inputHandler = (sequence: string): boolean => {
      const key: Key = { sequence }
      
      // Basic parsing
      if (sequence === "\r" || sequence === "\n") key.name = "enter" // or return
      else if (sequence === "\x1b") key.name = "escape"
      else if (sequence === "\x7f" || sequence === "\b") key.name = "backspace"
      else if (sequence === "\x1b[A") key.name = "up"
      else if (sequence === "\x1b[B") key.name = "down"
      else if (sequence === "\x1b[C") key.name = "right"
      else if (sequence === "\x1b[D") key.name = "left"
      else if (sequence === "\x1b[5~") key.name = "pageup"
      else if (sequence === "\x1b[6~") key.name = "pagedown"
      else if (sequence === "\t") key.name = "tab"
      
      // Control keys
      else if (sequence.length === 1 && sequence.charCodeAt(0) < 32) {
         key.ctrl = true
         // map \x01 to 'a', etc.
         // \x10 is Ctrl+P
         // \x0e is Ctrl+N
      }

      // Pass "enter" as alias for "return" to match expectations
      if (key.name === "enter") {
         handler(sequence, { ...key, name: "return" })
      }
      
      handler(sequence, key)
      
      // We always consume input when this hook is active? 
      // The previous code returned void, so it probably didn't handle consumption return value.
      // But prependInputHandler expects boolean.
      // If we return true, we consume it.
      // We should probably consume it if it matched something we care about, but strict consumption might block global keys.
      // For dialogs, usually we want to consume everything to trap focus.
      return true 
    }

    renderer.prependInputHandler(inputHandler)

    onCleanup(() => {
      renderer.removeInputHandler(inputHandler)
    })
  })
}
