import { Button, Host, Switch } from "@expo/ui";
import { useRouter } from "expo-router";
import { Suspense, useState } from "react";
import { Text, View } from "react-native";

import { NamePrompt } from "@/components/name-prompt";
import { useDb } from "@/db/context";
import { type FinishOptions, type Ledger, finishWorkout } from "@/db/workouts";
import { useI18n } from "@/lib/i18n";
import { spacing, type, useColors } from "@/lib/theme";
import { useCurrentWorkout, useWriteBack } from "@/lib/workout/use-workout";

export default function FinishWorkoutSheet() {
  return (
    <Suspense fallback={null}>
      <FinishCurrentWorkout />
    </Suspense>
  );
}

function FinishCurrentWorkout() {
  const ledger = useCurrentWorkout();
  return ledger ? <FinishWorkout ledger={ledger} /> : null;
}

// Skipped sets need no action: the sheet only says how many will be dropped. Changing the Routine
// is opt-in, so one day's improvising never rewrites the Routine by accident.
function FinishWorkout({ ledger }: { ledger: Ledger }) {
  const db = useDb();
  const router = useRouter();
  const p = useColors();
  const { t } = useI18n();
  const writeBack = useWriteBack(ledger.id);
  const [updatingRoutine, setUpdatingRoutine] = useState(false);
  const [naming, setNaming] = useState(false);
  const sets = ledger.exercises.flatMap((entry) => entry.sets);
  const unlogged = sets.filter((set) => !set.done).length;
  const nothingLogged = unlogged === sets.length;
  const message = nothingLogged
    ? t.finish.nothingLogged
    : unlogged > 0
      ? t.finish.unlogged(unlogged)
      : t.finish.allLogged;

  function finish(options: FinishOptions) {
    finishWorkout(db, ledger.id, options);
    // Straight back to the Workout tab: finishing shows no summary.
    router.dismissTo("/");
  }

  return (
    <View style={{ padding: spacing.xxl, gap: spacing.xl }}>
      <View style={{ gap: spacing.sm }}>
        <Text style={{ color: p.label, ...type.headline }}>{t.finish.title}</Text>
        <Text style={{ color: p.secondary, ...type.subheadline }}>{message}</Text>
      </View>
      {writeBack && (
        <View style={{ gap: spacing.sm }}>
          <Host matchContents style={{ alignSelf: "stretch" }}>
            <Switch
              value={updatingRoutine}
              onValueChange={setUpdatingRoutine}
              label={t.finish.writeBack(writeBack.routineName || t.routine.untitled)}
            />
          </Host>
          {writeBack.edits.map((edit, index) => (
            <Text key={index} style={{ color: p.secondary, ...type.footnote }}>
              {t.finish.edit(edit)}
            </Text>
          ))}
        </View>
      )}
      <View style={{ gap: spacing.sm }}>
        <Host matchContents style={{ alignSelf: "stretch" }}>
          <Button
            variant="filled"
            label={t.finish.confirm}
            onPress={() => finish({ writeBack: updatingRoutine })}
          />
        </Host>
        {ledger.routineName === null && !nothingLogged && (
          <Host matchContents style={{ alignSelf: "stretch" }}>
            <Button variant="text" label={t.finish.saveAsRoutine} onPress={() => setNaming(true)} />
          </Host>
        )}
      </View>
      <NamePrompt
        visible={naming}
        title={t.finish.saveAsRoutine}
        placeholder={t.routine.namePlaceholder}
        confirmLabel={t.finish.save}
        onSave={(name) => {
          setNaming(false);
          finish({ saveAsRoutine: name });
        }}
        onDismiss={() => setNaming(false)}
      />
    </View>
  );
}
