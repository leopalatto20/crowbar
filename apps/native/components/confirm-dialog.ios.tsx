import { Button, ConfirmationDialog, Host, Text } from "@expo/ui/swift-ui";

import { DialogAnchor } from "./dialog-anchor";
import type { ConfirmDialogProps } from "./confirm-dialog.types";

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onDismiss,
}: ConfirmDialogProps) {
  return (
    <Host matchContents>
      <ConfirmationDialog
        title={title}
        titleVisibility="visible"
        isPresented={visible}
        onIsPresentedChange={(presented) => {
          if (!presented) onDismiss();
        }}
      >
        <ConfirmationDialog.Trigger>
          <DialogAnchor />
        </ConfirmationDialog.Trigger>
        <ConfirmationDialog.Actions>
          <Button label={confirmLabel} role="destructive" onPress={onConfirm} />
          <Button label={cancelLabel} role="cancel" onPress={onDismiss} />
        </ConfirmationDialog.Actions>
        <ConfirmationDialog.Message>
          <Text>{message}</Text>
        </ConfirmationDialog.Message>
      </ConfirmationDialog>
    </Host>
  );
}
