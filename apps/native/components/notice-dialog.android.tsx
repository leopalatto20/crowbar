import { AlertDialog, Host, Text, TextButton } from "@expo/ui/jetpack-compose";

import type { NoticeDialogProps } from "./notice-dialog.types";

export function NoticeDialog({
  visible,
  title,
  message,
  dismissLabel,
  onDismiss,
}: NoticeDialogProps) {
  if (!visible) return null;
  return (
    <Host matchContents>
      <AlertDialog onDismissRequest={onDismiss}>
        <AlertDialog.Title>
          <Text>{title}</Text>
        </AlertDialog.Title>
        <AlertDialog.Text>
          <Text>{message}</Text>
        </AlertDialog.Text>
        <AlertDialog.ConfirmButton>
          <TextButton onClick={onDismiss}>
            <Text>{dismissLabel}</Text>
          </TextButton>
        </AlertDialog.ConfirmButton>
      </AlertDialog>
    </Host>
  );
}
