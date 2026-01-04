import {
  createContext,
  useContext,
  createSignal,
  type JSX,
  type Accessor,
} from "solid-js"
import { useTerminalDimensions } from "@opentui/solid"
import { useTheme } from "./ThemeContext"

export type ToastVariant = "info" | "success" | "warning" | "error"

export interface ToastOptions {
  title?: string
  message: string
  variant: ToastVariant
  duration?: number
}

export interface ToastContextValue {
  show: (options: ToastOptions) => void
  error: (err: unknown) => void
  currentToast: Accessor<ToastOptions | null>
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export interface ToastProviderProps {
  children: JSX.Element
}

export function ToastProvider(props: ToastProviderProps) {
  const [currentToast, setCurrentToast] = createSignal<ToastOptions | null>(null)
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const show = (options: ToastOptions) => {
    setCurrentToast(options)

    if (timeoutId) clearTimeout(timeoutId)

    const duration = options.duration ?? 5000
    timeoutId = setTimeout(() => {
      setCurrentToast(null)
    }, duration)
  }

  const error = (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err)
    show({
      title: "Error",
      message,
      variant: "error",
    })
  }

  const value: ToastContextValue = {
    show,
    error,
    currentToast,
  }

  return (
    <ToastContext.Provider value={value}>
      {props.children}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

export function Toast() {
  const { currentToast } = useToast()
  const { theme } = useTheme()
  const dimensions = useTerminalDimensions()

  // Use a derived signal for safe access
  const toast = () => currentToast()
  
  // Only render if there is a toast
  // Note: standard SolidJS control flow in JSX
  if (!toast()) return null

  const getBorderColor = (variant: ToastVariant) => {
    switch (variant) {
      case "info": return theme().info
      case "success": return theme().success
      case "warning": return theme().warning
      case "error": return theme().error
      default: return theme().border
    }
  }

  const maxWidth = () => Math.min(50, dimensions().width - 6)

  return (
    <box
      style={{
        position: "absolute",
        top: 2,
        right: 2,
        width: maxWidth(),
        borderStyle: "single",
        borderColor: getBorderColor(toast()!.variant),
        backgroundColor: theme().backgroundPanel,
        padding: 1,
        flexDirection: "column",
      }}
    >
      {toast()!.title && (
        <text>
           <span style={{ bold: true, fg: getBorderColor(toast()!.variant) }}>
            {toast()!.title}
          </span>
        </text>
      )}
      <text>{toast()!.message}</text>
    </box>
  )
}
