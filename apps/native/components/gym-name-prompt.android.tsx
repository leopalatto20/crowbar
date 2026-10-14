import {
  AlertDialog,
  Host,
  Text,
  TextButton,
  TextField,
  useNativeState,
} from "@expo/ui/jetpack-compose";
import { useState } from "react";

import { useI18n } from "@/lib/i18n";

import type { GymNamePromptProps } from "./gym-name-prompt.types";

// `message` is iOS-only: here the field's label is all the dialog needs to say.
export function GymNamePrompt({
  visible,
  title,
  confirmLabel,
  initialName = "",
  onSave,
  onDismiss,
}: GymNamePromptProps) {
  const { t } = useI18n();
  const [name, setName] = useState(initialName);
  const text = useNativeState(initialName);
  if (!visible) return null;
  return (
    <Host matchContents>
      <AlertDialog onDismissRequest={onDismiss}>
        <AlertDialog.Title>
          <Text>{title}</Text>
        </AlertDialog.Title>
        <AlertDialog.Text>
          <TextField value={text} onValueChange={setName} autoFocus singleLine>
            <TextField.Label>
              <Text>{t.gymPrompt.placeholder}</Text>
            </TextField.Label>
          </TextField>
        </AlertDialog.Text>
        <AlertDialog.ConfirmButton>
          <TextButton enabled={name.trim() !== ""} onClick={() => onSave(name)}>
            <Text>{confirmLabel}</Text>
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
