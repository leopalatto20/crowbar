import { Alert, Button, Host, Text } from "@expo/ui/swift-ui";

import { useI18n } from "@/lib/i18n";

import { DialogAnchor } from "./dialog-anchor";
import type { WorkoutInProgressAlertProps } from "./workout-in-progress-alert.types";

export function WorkoutInProgressAlert({
  visible,
  onResume,
  onDiscardAndStart,
  onDismiss,
}: WorkoutInProgressAlertProps) {
  const { t } = useI18n();
  return (
    <Host matchContents>
      <Alert
        title={t.workoutInProgress.title}
        isPresented={visible}
        onIsPresentedChange={(presented) => {
          if (!presented) onDismiss();
        }}
      >
        <Alert.Trigger>
          <DialogAnchor />
        </Alert.Trigger>
        <Alert.Actions>
          <Button label={t.workoutInProgress.resume} onPress={onResume} />
          <Button
            label={t.workoutInProgress.discardAndStart}
            role="destructive"
            onPress={onDiscardAndStart}
          />
          <Button label={t.workoutInProgress.cancel} role="cancel" onPress={onDismiss} />
        </Alert.Actions>
        <Alert.Message>
          <Text>{t.workoutInProgress.message}</Text>
        </Alert.Message>
      </Alert>
    </Host>
  );
}
