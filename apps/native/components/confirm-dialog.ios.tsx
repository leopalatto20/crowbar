import { Alert, Button, Host, Text } from "@expo/ui/swift-ui";

import { DialogAnchor } from "./dialog-anchor";
import type { ConfirmDialogProps } from "./confirm-dialog.types";

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  alternative,
  cancelLabel,
  onConfirm,
  onDismiss,
}: ConfirmDialogProps) {
  return (
    <Host matchContents>
      {/* An Alert, not a ConfirmationDialog: on iOS 26 a ConfirmationDialog is a popover whose
          tail points at its trigger, and the trigger can't sit on a toolbar menu like the
          Ledger's More button, so the tail pointed at empty space (#69). */}
      <Alert
        title={title}
        isPresented={visible}
        onIsPresentedChange={(presented) => {
          if (!presented) onDismiss();
        }}
      >
        <Alert.Trigger>
          <DialogAnchor />
        </Alert.Trigger>
        <Alert.Actions>
          {alternative && <Button label={alternative.label} onPress={alternative.onPress} />}
          <Button label={confirmLabel} role="destructive" onPress={onConfirm} />
          <Button label={cancelLabel} role="cancel" onPress={onDismiss} />
        </Alert.Actions>
        <Alert.Message>
          <Text>{message}</Text>
        </Alert.Message>
      </Alert>
    </Host>
  );
}
