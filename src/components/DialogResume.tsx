import { DialogConfirm } from "../ui/DialogConfirm"

export interface DialogResumeProps {
  iteration: number
  onResume: () => void
  onStartFresh: () => void
}

export function DialogResume(props: DialogResumeProps) {
  return (
    <DialogConfirm
      title="Resume Previous Run?"
      message={`Found interrupted session at iteration ${props.iteration}`}
      confirmLabel="Resume"
      cancelLabel="Start Fresh"
      onConfirm={props.onResume}
      onCancel={props.onStartFresh}
    />
  )
}
