import { AlertDialog, Host, Text, TextButton } from "@expo/ui/jetpack-compose";

import { useI18n } from "@/lib/i18n";

import type { ExactAlarmsPromptProps } from "./exact-alarms-prompt.types";

export function ExactAlarmsPrompt({ visible, onAnswer }: ExactAlarmsPromptProps) {
  const { t } = useI18n();
  if (!visible) return null;
  return (
    <Host matchContents>
      <AlertDialog onDismissRequest={() => onAnswer(false)}>
        <AlertDialog.Title>
          <Text>{t.restNotification.exactAlarmTitle}</Text>
        </AlertDialog.Title>
        <AlertDialog.Text>
          <Text>{t.restNotification.exactAlarmMessage}</Text>
        </AlertDialog.Text>
        <AlertDialog.ConfirmButton>
          <TextButton onClick={() => onAnswer(true)}>
            <Text>{t.restNotification.allow}</Text>
          </TextButton>
        </AlertDialog.ConfirmButton>
        <AlertDialog.DismissButton>
          <TextButton onClick={() => onAnswer(false)}>
            <Text>{t.restNotification.notNow}</Text>
          </TextButton>
        </AlertDialog.DismissButton>
      </AlertDialog>
    </Host>
  );
}
