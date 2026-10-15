export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  // Always destructive: confirms exist only in front of losing data.
  confirmLabel: string;
  // A safe way to the same end, offered before the destructive confirm.
  alternative?: { label: string; onPress: () => void };
  cancelLabel: string;
  onConfirm: () => void;
  onDismiss: () => void;
};
