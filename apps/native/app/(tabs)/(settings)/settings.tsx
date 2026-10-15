import {
  Button,
  FieldGroup,
  Host,
  Icon,
  ListItem,
  Picker,
  Row,
  Spacer,
  Switch,
  Text,
} from "@expo/ui";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Platform } from "react-native";

import { NoticeDialog } from "@/components/notice-dialog";
import { restOptions } from "@/components/routine/rest-options";
import { useDb } from "@/db/context";
import { updateSettings } from "@/db/settings";
import { exportBackup } from "@/lib/backup/export-backup";
import { useI18n } from "@/lib/i18n";
import { ageOf } from "@/lib/i18n/locale";
import { useSettings } from "@/lib/settings";
import { useColors } from "@/lib/theme";
import { useNotificationStatus } from "@/lib/workout/rest-notification";
import { EFFORTS, UNITS, formatClock } from "@/lib/workout/model";

export default function SettingsTab() {
  const db = useDb();
  const router = useRouter();
  const p = useColors();
  const { t } = useI18n();
  const { effortScale, defaultWeightUnit, restTimerEnabled, defaultRestSeconds, lastExportedAt } =
    useSettings();
  const notificationStatus = useNotificationStatus();
  // Once asked, only system settings can turn notifications back on; Crowbar never asks again.
  const denied = notificationStatus === "denied";
  const [exporting, setExporting] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);

  async function shareBackup() {
    setExporting(true);
    try {
      await exportBackup(db);
    } catch {
      setExportFailed(true);
    } finally {
      setExporting(false);
    }
  }

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
          <FieldGroup.Section title={t.settings.rest}>
            <Switch
              label={t.settings.restTimer}
              value={restTimerEnabled}
              onValueChange={(value) => updateSettings(db, { restTimerEnabled: value })}
            />
            <Row alignment="center">
              <Text>{t.settings.defaultRest}</Text>
              <Spacer flexible />
              <Picker
                selectedValue={defaultRestSeconds}
                onValueChange={(value) => updateSettings(db, { defaultRestSeconds: value })}
              >
                {restOptions(defaultRestSeconds).map((seconds) => (
                  <Picker.Item key={seconds} label={formatClock(seconds)} value={seconds} />
                ))}
              </Picker>
            </Row>
            {notificationStatus && (
              <ListItem
                onPress={denied ? () => void Linking.openSettings() : undefined}
                trailing={
                  <Row alignment="center" spacing={6}>
                    <Text textStyle={{ color: p.secondary }}>
                      {t.settings.notificationStatus[notificationStatus]}
                    </Text>
                    {denied && Platform.OS === "ios" && (
                      <Icon name="chevron.right" size={13} color={p.tertiary} />
                    )}
                  </Row>
                }
              >
                <Text>{t.settings.notifications}</Text>
              </ListItem>
            )}
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
          <FieldGroup.Section title={t.settings.data}>
            <Button
              variant="text"
              label={t.settings.exportBackup}
              disabled={exporting}
              onPress={() => void shareBackup()}
            />
            {lastExportedAt !== null && (
              <FieldGroup.SectionFooter>
                <Text>{t.settings.lastExported(t.ago(ageOf(lastExportedAt, Date.now())))}</Text>
              </FieldGroup.SectionFooter>
            )}
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
      <NoticeDialog
        visible={exportFailed}
        title={t.settings.exportFailedTitle}
        message={t.settings.exportFailedMessage}
        dismissLabel={t.settings.exportFailedDismiss}
        onDismiss={() => setExportFailed(false)}
      />
    </>
  );
}
