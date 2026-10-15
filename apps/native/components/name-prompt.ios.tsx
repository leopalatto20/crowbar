import { Alert, Button, Host, Text, TextField, useNativeState } from "@expo/ui/swift-ui";
import { useState } from "react";

import { useI18n } from "@/lib/i18n";

import { DialogAnchor } from "./dialog-anchor";
import type { NamePromptProps } from "./name-prompt.types";

export function NamePrompt({
  visible,
  title,
  placeholder,
  message,
  confirmLabel,
  initialName = "",
  onSave,
  onDismiss,
}: NamePromptProps) {
  const { t } = useI18n();
  const [name, setName] = useState(initialName);
  const text = useNativeState(initialName);
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
          {/* No autoFocus: the system alert focuses its first field itself. With autoFocus as
              well, the field opened unfocused with no keyboard on device (#70). */}
          <TextField text={text} placeholder={placeholder} onTextChange={setName} />
          <Button label={t.namePrompt.cancel} role="cancel" onPress={onDismiss} />
          <Button
            label={confirmLabel}
            onPress={() => {
              if (name.trim()) onSave(name);
            }}
          />
        </Alert.Actions>
        {message && (
          <Alert.Message>
            <Text>{message}</Text>
          </Alert.Message>
        )}
      </Alert>
    </Host>
  );
}
