export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  // Always destructive: confirms exist only in front of losing data.
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onDismiss: () => void;
};
