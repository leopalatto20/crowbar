import { AlertDialog, Host, Text, TextButton } from "@expo/ui/jetpack-compose";

import { useI18n } from "@/lib/i18n";
import { useColors } from "@/lib/theme";

import type { WorkoutInProgressAlertProps } from "./workout-in-progress-alert.types";

export function WorkoutInProgressAlert({
  visible,
  onResume,
  onDiscardAndStart,
  onDismiss,
}: WorkoutInProgressAlertProps) {
  const { t } = useI18n();
  const p = useColors();
  if (!visible) return null;
  return (
    <Host matchContents>
      <AlertDialog onDismissRequest={onDismiss}>
        <AlertDialog.Title>
          <Text>{t.workoutInProgress.title}</Text>
        </AlertDialog.Title>
        <AlertDialog.Text>
          <Text>{t.workoutInProgress.message}</Text>
        </AlertDialog.Text>
        {/* Material dialogs have two button slots; Compose lays both out in one flow row, so
            the third action shares the confirm slot. */}
        <AlertDialog.ConfirmButton>
          <TextButton onClick={onDiscardAndStart}>
            <Text color={p.red}>{t.workoutInProgress.discardAndStart}</Text>
          </TextButton>
          <TextButton onClick={onResume}>
            <Text>{t.workoutInProgress.resume}</Text>
          </TextButton>
        </AlertDialog.ConfirmButton>
        <AlertDialog.DismissButton>
          <TextButton onClick={onDismiss}>
            <Text>{t.workoutInProgress.cancel}</Text>
          </TextButton>
        </AlertDialog.DismissButton>
      </AlertDialog>
    </Host>
  );
}
