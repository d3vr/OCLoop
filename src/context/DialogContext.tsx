/**
 * Dialog Context Provider
 *
 * Provides a stack-based dialog manager for modal dialogs.
 * Supports showing, replacing, and clearing dialogs.
 *
 * Note: Escape key handling should be implemented in the parent component
 * that manages the input handler (typically App.tsx). Use the `pop()` method
 * to dismiss the top dialog on Escape.
 */

import {
  createContext,
  useContext,
  createSignal,
  type JSX,
  type Accessor,
} from "solid-js"

/**
 * A dialog component in the stack
 */
export type DialogComponent = () => JSX.Element

/**
 * Value provided by the DialogContext
 */
export interface DialogContextValue {
  /** Push a dialog onto the stack */
  show: (component: DialogComponent) => void
  /** Clear all dialogs and push a new one */
  replace: (component: DialogComponent) => void
  /** Pop all dialogs from the stack */
  clear: () => void
  /** Pop the top dialog from the stack (use for Escape key handling) */
  pop: () => void
  /** Current dialog stack accessor */
  stack: Accessor<DialogComponent[]>
  /** Check if any dialogs are open */
  hasDialogs: Accessor<boolean>
}

/**
 * The Dialog Context
 */
const DialogContext = createContext<DialogContextValue | undefined>(undefined)

/**
 * Props for DialogProvider
 */
export interface DialogProviderProps {
  children: JSX.Element
}

/**
 * Dialog Provider Component
 *
 * Wraps the application and provides dialog management via context.
 *
 * Note: Escape key handling must be implemented in the component that
 * manages the renderer's input handler. Call `dialog.pop()` when Escape
 * is pressed and `dialog.hasDialogs()` is true.
 *
 * @example
 * ```tsx
 * <DialogProvider>
 *   <App />
 *   <DialogStack />
 * </DialogProvider>
 * ```
 */
export function DialogProvider(props: DialogProviderProps) {
  const [stack, setStack] = createSignal<DialogComponent[]>([])

  /**
   * Push a dialog onto the stack
   */
  const show = (component: DialogComponent) => {
    setStack((prev) => [...prev, component])
  }

  /**
   * Clear all dialogs and push a new one
   */
  const replace = (component: DialogComponent) => {
    setStack([component])
  }

  /**
   * Pop all dialogs from the stack
   */
  const clear = () => {
    setStack([])
  }

  /**
   * Pop the top dialog from the stack
   */
  const pop = () => {
    setStack((prev) => {
      if (prev.length === 0) return prev
      return prev.slice(0, -1)
    })
  }

  /**
   * Check if any dialogs are open
   */
  const hasDialogs = () => stack().length > 0

  const value: DialogContextValue = {
    show,
    replace,
    clear,
    pop,
    stack,
    hasDialogs,
  }

  return (
    <DialogContext.Provider value={value}>
      {props.children}
    </DialogContext.Provider>
  )
}

/**
 * Hook to access the dialog manager
 *
 * @returns DialogContextValue with show, replace, clear, pop, and stack
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const dialog = useDialog()
 *
 *   const showConfirmation = () => {
 *     dialog.show(() => (
 *       <Dialog onClose={() => dialog.clear()}>
 *         <text>Are you sure?</text>
 *       </Dialog>
 *     ))
 *   }
 *
 *   return <button onClick={showConfirmation}>Show Dialog</button>
 * }
 * ```
 */
export function useDialog(): DialogContextValue {
  const context = useContext(DialogContext)

  if (!context) {
    throw new Error("useDialog must be used within a DialogProvider")
  }

  return context
}

/**
 * Component to render the dialog stack
 *
 * Place this at the top level of your app to render active dialogs.
 * The DialogStack should be placed after the main content so dialogs
 * render on top.
 *
 * @example
 * ```tsx
 * <DialogProvider>
 *   <App />
 *   <DialogStack />
 * </DialogProvider>
 * ```
 */
export function DialogStack() {
  const { stack } = useDialog()

  return (
    <>
      {stack().map((DialogComponent, index) => (
        <DialogComponent key={index} />
      ))}
    </>
  )
}
