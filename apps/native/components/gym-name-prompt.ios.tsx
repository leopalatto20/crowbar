import { Alert, Button, Host, Text, TextField } from "@expo/ui/swift-ui";
import { useState } from "react";

import { useI18n } from "@/lib/i18n";

import { DialogAnchor } from "./dialog-anchor";
import type { GymNamePromptProps } from "./gym-name-prompt.types";

// The first Workout start asks only for a Gym name, in place of any onboarding.
export function GymNamePrompt({ visible, onSave, onDismiss }: GymNamePromptProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  return (
    <Host matchContents>
      <Alert
        title={t.gymPrompt.title}
        isPresented={visible}
        onIsPresentedChange={(presented) => {
          if (!presented) onDismiss();
        }}
      >
        <Alert.Trigger>
          <DialogAnchor />
        </Alert.Trigger>
        <Alert.Actions>
          <TextField placeholder={t.gymPrompt.placeholder} onTextChange={setName} autoFocus />
          <Button label={t.gymPrompt.cancel} role="cancel" onPress={onDismiss} />
          <Button
            label={t.gymPrompt.start}
            onPress={() => {
              if (name.trim()) onSave(name);
            }}
          />
        </Alert.Actions>
        <Alert.Message>
          <Text>{t.gymPrompt.message}</Text>
        </Alert.Message>
      </Alert>
    </Host>
  );
}
