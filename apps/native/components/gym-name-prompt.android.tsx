import { AlertDialog, Host, Text, TextButton, TextField } from "@expo/ui/jetpack-compose";
import { useState } from "react";

import { useI18n } from "@/lib/i18n";

import type { GymNamePromptProps } from "./gym-name-prompt.types";

// The first Workout start asks only for a Gym name, in place of any onboarding.
export function GymNamePrompt({ visible, onSave, onDismiss }: GymNamePromptProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  if (!visible) return null;
  return (
    <Host matchContents>
      <AlertDialog onDismissRequest={onDismiss}>
        <AlertDialog.Title>
          <Text>{t.gymPrompt.title}</Text>
        </AlertDialog.Title>
        <AlertDialog.Text>
          <TextField onValueChange={setName} autoFocus singleLine>
            <TextField.Label>
              <Text>{t.gymPrompt.placeholder}</Text>
            </TextField.Label>
          </TextField>
        </AlertDialog.Text>
        <AlertDialog.ConfirmButton>
          <TextButton enabled={name.trim() !== ""} onClick={() => onSave(name)}>
            <Text>{t.gymPrompt.start}</Text>
          </TextButton>
        </AlertDialog.ConfirmButton>
        <AlertDialog.DismissButton>
          <TextButton onClick={onDismiss}>
            <Text>{t.gymPrompt.cancel}</Text>
          </TextButton>
        </AlertDialog.DismissButton>
      </AlertDialog>
    </Host>
  );
}
