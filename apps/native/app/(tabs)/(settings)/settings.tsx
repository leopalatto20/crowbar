import { FieldGroup, Host, Picker, Row, Spacer, Text } from "@expo/ui";
import { Stack } from "expo-router";

import { useDb } from "@/db/context";
import { updateSettings } from "@/db/settings";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { EFFORTS, UNITS, type Unit } from "@/lib/workout/model";

export default function SettingsTab() {
  const db = useDb();
  const { t } = useI18n();
  const { effortScale, defaultWeightUnit } = useSettings();
  const unitLabel = (unit: Unit) => (unit === "level" ? t.settings.stackLevel : t.unit[unit]);

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
                  <Picker.Item key={unit} label={unitLabel(unit)} value={unit} />
                ))}
              </Picker>
            </Row>
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    </>
  );
}
