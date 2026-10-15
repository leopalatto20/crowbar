import { AlertDialog, Host, Text, TextButton } from "@expo/ui/jetpack-compose";

import { useColors } from "@/lib/theme";

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
  const p = useColors();
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
        {/* Material dialogs have two button slots; Compose lays both out in one flow row, so
            the alternative shares the confirm slot. */}
        <AlertDialog.ConfirmButton>
          <TextButton onClick={onConfirm}>
            <Text color={p.red}>{confirmLabel}</Text>
          </TextButton>
          {alternative && (
            <TextButton onClick={alternative.onPress}>
              <Text>{alternative.label}</Text>
            </TextButton>
          )}
        </AlertDialog.ConfirmButton>
        <AlertDialog.DismissButton>
          <TextButton onClick={onDismiss}>
            <Text>{cancelLabel}</Text>
          </TextButton>
        </AlertDialog.DismissButton>
      </AlertDialog>
    </Host>
  );
}
