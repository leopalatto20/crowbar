import { Alert, Button, Host, Text, TextField, useNativeState } from "@expo/ui/swift-ui";
import { useState } from "react";

import { useI18n } from "@/lib/i18n";

import { DialogAnchor } from "./dialog-anchor";
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
  return (
    <Host matchContents>
      <Alert
        title={t.stationPrompt.title}
        isPresented={visible}
        onIsPresentedChange={(presented) => {
          if (!presented) close(onDismiss);
        }}
      >
        <Alert.Trigger>
          <DialogAnchor />
        </Alert.Trigger>
        <Alert.Actions>
          {nameExisting && (
            <TextField
              text={existingText}
              placeholder={t.stationPrompt.existingPlaceholder}
              onTextChange={setExistingLabel}
            />
          )}
          <TextField
            text={labelText}
            placeholder={t.stationPrompt.placeholder}
            onTextChange={setLabel}
          />
          <Button label={t.stationPrompt.cancel} role="cancel" onPress={() => close(onDismiss)} />
          <Button
            label={t.stationPrompt.add}
            onPress={() => {
              if (complete)
                close(() => onSave(nameExisting ? { label, existingLabel } : { label }));
            }}
          />
        </Alert.Actions>
        {nameExisting && (
          <Alert.Message>
            <Text>{t.stationPrompt.nameBoth}</Text>
          </Alert.Message>
        )}
      </Alert>
    </Host>
  );
}
