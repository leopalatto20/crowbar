import {
  AlertDialog,
  Column,
  Host,
  Text,
  TextButton,
  TextField,
  useNativeState,
} from "@expo/ui/jetpack-compose";
import { useState } from "react";

import { useI18n } from "@/lib/i18n";

import type { StationLabelPromptProps } from "./station-label-prompt.types";

export function StationLabelPrompt({
  visible,
  nameExisting,
  onSave,
  onDismiss,
}: StationLabelPromptProps) {
  const { t } = useI18n();
  const [label, setLabel] = useState("");
  const [existingLabel, setExistingLabel] = useState("");
  const labelText = useNativeState("");
  const existingText = useNativeState("");
  const complete = label.trim() !== "" && (!nameExisting || existingLabel.trim() !== "");

  // The prompt stays mounted between Stations, so each one starts blank.
  function close(then: () => void) {
    setLabel("");
    setExistingLabel("");
    labelText.set("");
    existingText.set("");
    then();
  }
  if (!visible) return null;
  return (
    <Host matchContents>
      <AlertDialog onDismissRequest={() => close(onDismiss)}>
        <AlertDialog.Title>
          <Text>{t.stationPrompt.title}</Text>
        </AlertDialog.Title>
        <AlertDialog.Text>
          <Column>
            {nameExisting && <Text>{t.stationPrompt.nameBoth}</Text>}
            {nameExisting && (
              <TextField value={existingText} onValueChange={setExistingLabel} autoFocus singleLine>
                <TextField.Label>
                  <Text>{t.stationPrompt.existingPlaceholder}</Text>
                </TextField.Label>
              </TextField>
            )}
            <TextField
              value={labelText}
              onValueChange={setLabel}
              autoFocus={!nameExisting}
              singleLine
            >
              <TextField.Label>
                <Text>{t.stationPrompt.placeholder}</Text>
              </TextField.Label>
            </TextField>
          </Column>
        </AlertDialog.Text>
        <AlertDialog.ConfirmButton>
          <TextButton
            enabled={complete}
            onClick={() => close(() => onSave(nameExisting ? { label, existingLabel } : { label }))}
          >
            <Text>{t.stationPrompt.add}</Text>
          </TextButton>
        </AlertDialog.ConfirmButton>
        <AlertDialog.DismissButton>
          <TextButton onClick={() => close(onDismiss)}>
            <Text>{t.stationPrompt.cancel}</Text>
          </TextButton>
        </AlertDialog.DismissButton>
      </AlertDialog>
    </Host>
  );
}
