import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { startTransition, useState } from "react";
import { Pressable, ScrollView, Text, type TextStyle, View } from "react-native";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { EditExerciseSheet } from "@/components/custom-exercise-sheet";
import { useDeleteExercise } from "@/components/delete-exercise";
import { EmptyState } from "@/components/empty-state";
import { NotesInput, NotesLine } from "@/components/machine-notes";
import { NamePrompt } from "@/components/name-prompt";
import { useDb } from "@/db/context";
import type { ProgressOpening, ProgressStation, RepRecords, StationWorkout } from "@/db/progress";
import {
  type StationHistoryCounts,
  deleteStation,
  mergeStation,
  renameStation,
  setStationNotes,
  stationHistoryCounts,
} from "@/db/stations";
import { useExerciseProgress } from "@/lib/exercise/use-progress";
import { useI18n } from "@/lib/i18n";
import { radii, spacing, type, useColors } from "@/lib/theme";
import { useEffort } from "@/lib/workout/effort";
import { type LoadFormat, formatLoad, formatPerformance } from "@/lib/workout/model";

import { ExerciseDetailToolbar } from "./exercise-detail-toolbar";
import { ProgressChart } from "./progress-chart";
import { stationName } from "./station-name";
import { StationSwitcher } from "./station-switcher";

// Opens on `stationId` when given, else on the Station last used at `gymId`, or at the current or
// last-used Gym when that's not given either. `onDone` adds a Done button, for when it's a sheet.
export function ExerciseDetail({
  exerciseId,
  stationId: initialStationId,
  gymId,
  onDone,
}: ProgressOpening & { exerciseId: string; onDone?: () => void }) {
  const db = useDb();
  const router = useRouter();
  const p = useColors();
  const i18n = useI18n();
  const { t } = i18n;
  const [stationId, setStationId] = useState(initialStationId);
  const [editingNotes, setEditingNotes] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [editingExercise, setEditingExercise] = useState(false);
  // Counted when the confirm opens, so it states exactly what the action will take.
  const [merging, setMerging] = useState<{ target: ProgressStation; sets: number } | null>(null);
  const [deletingStation, setDeletingStation] = useState<StationHistoryCounts | null>(null);
  const exerciseDeletion = useDeleteExercise(() => router.back());
  const progress = useExerciseProgress(exerciseId, { stationId, gymId });
  if (!progress) return null;
  const { selected } = progress;
  // Keeps the current Station on screen while the next one reads, instead of blanking.
  const switchTo = (id: string | undefined) => startTransition(() => setStationId(id));

  return (
    <>
      <Stack.Screen options={{ title: progress.name }} />
      <ExerciseDetailToolbar
        exerciseId={exerciseId}
        progress={progress}
        onDone={onDone}
        onRename={() => setRenaming(true)}
        onEditNotes={() => setEditingNotes(true)}
        onMerge={(target) =>
          setMerging({ target, sets: stationHistoryCounts(db, selected!.station.id).sets })
        }
        onDeleteStation={() => setDeletingStation(stationHistoryCounts(db, selected!.station.id))}
        onEditExercise={() => setEditingExercise(true)}
        onDeleteExercise={() =>
          exerciseDeletion.request({ id: exerciseId, name: progress.name, hidden: progress.hidden })
        }
      />
      {!selected ? (
        <EmptyState message={t.exerciseDetail.noSets} />
      ) : (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          style={{ backgroundColor: p.background }}
          contentContainerStyle={{
            padding: spacing.xl,
            paddingBottom: spacing.xxl * 2,
            gap: spacing.xl,
          }}
        >
          <View style={{ gap: spacing.xs }}>
            <StationSwitcher
              stations={progress.stations}
              current={selected.station}
              onSwitch={switchTo}
            />
            <Text style={{ color: p.secondary, ...type.footnote }}>
              {t.exerciseDetail.loadsIn(t.unitName[selected.format.unit])}
            </Text>
            {editingNotes ? (
              <NotesInput
                notes={selected.notes}
                onCommit={(text) => {
                  setStationNotes(db, selected.station.id, text);
                  setEditingNotes(false);
                }}
              />
            ) : (
              selected.notes && (
                <NotesLine notes={selected.notes} onPress={() => setEditingNotes(true)} />
              )
            )}
          </View>
          {selected.workouts.length === 0 ? (
            <Text style={{ color: p.secondary, ...type.body, textAlign: "center" }}>
              {t.exerciseDetail.noWorkingSets}
            </Text>
          ) : (
            <>
              <Card>
                <ProgressChart chart={selected.chart} format={selected.format} />
              </Card>
              <RepRecordsCard records={selected.repRecords} format={selected.format} />
              {selected.workouts.map((stationWorkout) => (
                <WorkoutSets
                  key={stationWorkout.id}
                  workout={stationWorkout}
                  format={selected.format}
                />
              ))}
            </>
          )}
        </ScrollView>
      )}
      {selected && (
        <>
          <NamePrompt
            // Remounted per Station, so the field starts from the label it has now.
            key={`${selected.station.id}:${selected.station.label}`}
            visible={renaming}
            title={t.stationActions.rename}
            placeholder={t.stationActions.renamePlaceholder}
            confirmLabel={t.stationActions.save}
            initialName={selected.station.label ?? ""}
            onSave={(label) => {
              setRenaming(false);
              renameStation(db, selected.station.id, label);
            }}
            onDismiss={() => setRenaming(false)}
          />
          <ConfirmDialog
            visible={merging !== null}
            title={merging ? t.stationActions.mergeTitle(stationName(merging.target, i18n)) : ""}
            message={
              merging
                ? [
                    t.stationActions.mergeMessage(merging.sets, stationName(merging.target, i18n)),
                    ...(merging.target.unit === selected.station.unit
                      ? []
                      : [t.stationActions.mergeUnit(t.unitName[merging.target.unit])]),
                  ].join(" ")
                : ""
            }
            confirmLabel={t.stationActions.merge}
            cancelLabel={t.stationActions.cancel}
            onConfirm={() => {
              setMerging(null);
              if (!merging) return;
              mergeStation(db, selected.station.id, merging.target.id);
              switchTo(merging.target.id);
            }}
            onDismiss={() => setMerging(null)}
          />
          <ConfirmDialog
            visible={deletingStation !== null}
            title={t.stationActions.deleteTitle(stationName(selected.station, i18n))}
            message={deletingStation ? t.stationActions.deleteMessage(deletingStation) : ""}
            confirmLabel={t.stationActions.delete}
            cancelLabel={t.stationActions.cancel}
            onConfirm={() => {
              setDeletingStation(null);
              deleteStation(db, selected.station.id);
              switchTo(undefined);
            }}
            onDismiss={() => setDeletingStation(null)}
          />
        </>
      )}
      <EditExerciseSheet
        exerciseId={editingExercise ? exerciseId : null}
        onClose={() => setEditingExercise(false)}
      />
      {exerciseDeletion.dialog}
    </>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  const p = useColors();
  return (
    <View
      style={{
        backgroundColor: p.card,
        borderRadius: radii.card,
        borderCurve: "continuous",
        paddingVertical: spacing.lg,
        paddingHorizontal: 14,
        gap: spacing.sm,
      }}
    >
      {children}
    </View>
  );
}

function WorkoutSets({ workout, format }: { workout: StationWorkout; format: LoadFormat }) {
  const p = useColors();
  const effort = useEffort();
  const i18n = useI18n();
  return (
    <Card>
      <Text style={{ color: p.secondary, ...type.footnote, fontWeight: "600" }}>
        {i18n.formatDate(workout.startedAt, workout.timeZone)}
      </Text>
      {workout.sets.map((set) => (
        <View
          key={set.number}
          style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 24 }}
        >
          <Text
            style={{
              width: 20,
              color: p.secondary,
              ...type.cell,
              fontWeight: "700",
              fontVariant: ["tabular-nums"],
            }}
          >
            {set.number}
          </Text>
          <Text style={{ flex: 1, color: p.label, ...type.callout, fontVariant: ["tabular-nums"] }}>
            {formatPerformance(set, format, effort, i18n)}
          </Text>
          {set.beat && (
            <SymbolView
              name={{ ios: "arrow.up", android: "arrow_upward" }}
              size={15}
              weight="bold"
              tintColor={p.green}
              accessibilityLabel={i18n.t.exerciseDetail.beat}
            />
          )}
        </View>
      ))}
    </Card>
  );
}

// Collapsed by default: records are looked up now and then, while the sets are read every time.
function RepRecordsCard({ records, format }: { records: RepRecords; format: LoadFormat }) {
  const p = useColors();
  const i18n = useI18n();
  const { t } = i18n;
  const [expanded, setExpanded] = useState(false);
  const load = (value: number) => formatLoad(value, format, i18n);
  const reps = (value: number) => (format.unilateral ? t.load.perSide(value) : String(value));
  return (
    <Card>
      <Pressable
        onPress={() => setExpanded((open) => !open)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={{ flexDirection: "row", alignItems: "center" }}
      >
        <Text style={{ flex: 1, color: p.label, ...type.headline }}>
          {t.exerciseDetail.repRecords}
        </Text>
        <SymbolView
          name={
            expanded
              ? { ios: "chevron.up", android: "expand_less" }
              : { ios: "chevron.down", android: "expand_more" }
          }
          size={14}
          weight="semibold"
          tintColor={p.secondary}
        />
      </Pressable>
      {expanded && (
        <View style={{ flexDirection: "row", gap: spacing.xl, paddingTop: spacing.sm }}>
          <RecordTable
            title={t.exerciseDetail.mostRepsByLoad}
            columns={[t.exerciseDetail.loadColumn, t.exerciseDetail.repsColumn]}
            rows={records.mostRepsByLoad.map((record) => [load(record.load), reps(record.reps)])}
          />
          <RecordTable
            title={t.exerciseDetail.heaviestByReps}
            columns={[t.exerciseDetail.repsColumn, t.exerciseDetail.loadColumn]}
            rows={records.heaviestByReps.map((record) => [reps(record.reps), load(record.load)])}
          />
        </View>
      )}
    </Card>
  );
}

function RecordTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: [string, string];
  rows: [string, string][];
}) {
  const p = useColors();
  const cell: TextStyle = { flex: 1, ...type.cell, fontVariant: ["tabular-nums"] };
  return (
    <View style={{ flex: 1, gap: spacing.xs }}>
      <Text style={{ color: p.secondary, ...type.footnote, fontWeight: "600" }}>{title}</Text>
      <View style={{ flexDirection: "row" }}>
        {columns.map((column) => (
          <Text key={column} style={{ ...cell, color: p.secondary, ...type.columnHeader }}>
            {column}
          </Text>
        ))}
      </View>
      {rows.map(([key, value]) => (
        <View key={key} style={{ flexDirection: "row" }}>
          <Text style={{ ...cell, color: p.label }}>{key}</Text>
          <Text style={{ ...cell, color: p.label, fontWeight: "600" }}>{value}</Text>
        </View>
      ))}
    </View>
  );
}
