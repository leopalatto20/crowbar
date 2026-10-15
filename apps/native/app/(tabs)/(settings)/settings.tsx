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
import { useRef, useState } from "react";
import { Linking, Platform } from "react-native";

import { NoticeDialog } from "@/components/notice-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { restOptions } from "@/components/routine/rest-options";
import { type DataSummary, summarizeData } from "@/db/backups";
import { useDatabaseReplacement, useDb } from "@/db/context";
import { updateSettings } from "@/db/settings";
import { currentWorkout } from "@/db/workouts";
import { exportBackup } from "@/lib/backup/export-backup";
import { discardPickedBackup, pickBackup } from "@/lib/backup/restore-backup";
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
  const { t, formatFullDate } = useI18n();
  const replacement = useDatabaseReplacement();
  const {
    effortScale,
    defaultWeightUnit,
    restTimerEnabled,
    defaultRestSeconds,
    lastExportedAt,
    undoRestoreReplacedAt,
  } = useSettings();
  const notificationStatus = useNotificationStatus();
  // Once asked, only system settings can turn notifications back on; Crowbar never asks again.
  const denied = notificationStatus === "denied";
  const [exporting, setExporting] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);
  const [picking, setPicking] = useState(false);
  // Kept after dismissing, so a dialog's text holds while it animates away.
  const [notice, setNotice] = useState({ title: "", message: "", shown: false });
  const [restoring, setRestoring] = useState({
    backup: { workouts: 0, lastWorkoutAt: null } as DataSummary,
    current: { workouts: 0, lastWorkoutAt: null } as DataSummary,
    shown: false,
  });
  const [undoing, setUndoing] = useState(false);
  // iOS reports a confirmed alert as dismissed too, which mustn't discard the Backup being restored.
  const restoreConfirmed = useRef(false);

  function showNotice(title: string, message: string) {
    setNotice({ title, message, shown: true });
  }

  // Restoring replaces the Workout in progress along with everything else.
  function refusedMidWorkout() {
    if (!currentWorkout(db)) return false;
    showNotice(t.restore.workoutInProgressTitle, t.restore.workoutInProgressMessage);
    return true;
  }

  async function chooseBackup() {
    if (refusedMidWorkout()) return;
    setPicking(true);
    try {
      const inspection = await pickBackup(db, replacement.folder);
      if (!inspection) return;
      if (!inspection.valid) {
        showNotice(t.restore.rejectedTitle, t.restore.rejected[inspection.problem]);
        return;
      }
      restoreConfirmed.current = false;
      setRestoring({ backup: inspection, current: summarizeData(db), shown: true });
    } catch {
      discardPickedBackup(replacement.folder);
      showNotice(t.restore.failedTitle.restore, t.restore.failedMessage.restore);
    } finally {
      setPicking(false);
    }
  }

  function describe({ workouts, lastWorkoutAt }: DataSummary) {
    return t.restore.summary(
      workouts,
      lastWorkoutAt === null ? null : formatFullDate(lastWorkoutAt),
    );
  }

  const replacedOn = undoRestoreReplacedAt === null ? "" : formatFullDate(undoRestoreReplacedAt);

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
            <Button
              variant="text"
              label={t.restore.restoreFromBackup}
              disabled={picking}
              onPress={() => void chooseBackup()}
            />
            {undoRestoreReplacedAt !== null && (
              <Button
                variant="text"
                label={t.restore.undoRestore(replacedOn)}
                onPress={() => {
                  if (!refusedMidWorkout()) setUndoing(true);
                }}
              />
            )}
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
      <NoticeDialog
        visible={notice.shown}
        title={notice.title}
        message={notice.message}
        dismissLabel={t.restore.dismiss}
        onDismiss={() => setNotice({ ...notice, shown: false })}
      />
      <ConfirmDialog
        visible={restoring.shown}
        title={t.restore.confirmTitle}
        message={t.restore.confirmMessage(describe(restoring.backup), describe(restoring.current))}
        confirmLabel={t.restore.confirm}
        cancelLabel={t.restore.cancel}
        onConfirm={() => {
          restoreConfirmed.current = true;
          setRestoring({ ...restoring, shown: false });
          replacement.restore();
        }}
        onDismiss={() => {
          setRestoring({ ...restoring, shown: false });
          if (!restoreConfirmed.current) discardPickedBackup(replacement.folder);
        }}
      />
      <ConfirmDialog
        visible={undoing}
        title={t.restore.undoTitle}
        message={t.restore.undoMessage(replacedOn)}
        confirmLabel={t.restore.undo}
        cancelLabel={t.restore.cancel}
        onConfirm={() => {
          setUndoing(false);
          replacement.undoRestore();
        }}
        onDismiss={() => setUndoing(false)}
      />
    </>
  );
}
