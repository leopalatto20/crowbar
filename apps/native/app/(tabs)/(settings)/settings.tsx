import { FieldGroup, Host, Icon, ListItem, Picker, Row, Spacer, Text } from "@expo/ui";
import { Stack, useRouter } from "expo-router";
import { Platform } from "react-native";

import { useDb } from "@/db/context";
import { updateSettings } from "@/db/settings";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { useColors } from "@/lib/theme";
import { EFFORTS, UNITS } from "@/lib/workout/model";

export default function SettingsTab() {
  const db = useDb();
  const router = useRouter();
  const p = useColors();
  const { t } = useI18n();
  const { effortScale, defaultWeightUnit } = useSettings();

  return (
    <>
      <Stack.Screen options={{ title: t.tabs.settings }} />
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section title={t.settings.logging}>
            <Row alignment="center">
              <Text>{t.settings.effortScale}</Text>
              <Spacer flexible />
              <Picker
                selectedValue={effortScale}
                onValueChange={(value) => updateSettings(db, { effortScale: value })}
              >
                {EFFORTS.map((effort) => (
                  <Picker.Item key={effort} label={t.effort[effort]} value={effort} />
                ))}
              </Picker>
            </Row>
            <Row alignment="center">
              <Text>{t.settings.defaultWeightUnit}</Text>
              <Spacer flexible />
              <Picker
                selectedValue={defaultWeightUnit}
                onValueChange={(value) => updateSettings(db, { defaultWeightUnit: value })}
              >
                {UNITS.map((unit) => (
                  <Picker.Item key={unit} label={t.unitName[unit]} value={unit} />
                ))}
              </Picker>
            </Row>
          </FieldGroup.Section>
          <FieldGroup.Section title={t.settings.training}>
            <ListItem
              onPress={() => router.push("/gyms")}
              // A pushing row reads as one on iOS by its chevron; Material rows go without.
              trailing={
                Platform.OS === "ios" ? (
                  <Icon name="chevron.right" size={13} color={p.tertiary} />
                ) : undefined
              }
            >
              <Text>{t.settings.gyms}</Text>
            </ListItem>
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    </>
  );
}
