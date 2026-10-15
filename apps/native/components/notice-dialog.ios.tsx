import { Alert, Button, Host, Text } from "@expo/ui/swift-ui";

import { DialogAnchor } from "./dialog-anchor";
import type { NoticeDialogProps } from "./notice-dialog.types";

export function NoticeDialog({
  visible,
  title,
  message,
  dismissLabel,
  onDismiss,
}: NoticeDialogProps) {
  return (
    <Host matchContents>
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
          <Button label={dismissLabel} role="cancel" onPress={onDismiss} />
        </Alert.Actions>
        <Alert.Message>
          <Text>{message}</Text>
        </Alert.Message>
      </Alert>
    </Host>
  );
}
