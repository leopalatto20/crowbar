import { Stack } from "expo-router";
import { SymbolView } from "expo-symbols";
import { startTransition, useState } from "react";
import { Pressable, ScrollView, Text, type TextStyle, View } from "react-native";

import { EmptyState } from "@/components/empty-state";
import type { RepRecords, StationWorkout } from "@/db/progress";
import { useExerciseProgress } from "@/lib/exercise/use-progress";
import { useI18n } from "@/lib/i18n";
import { radii, spacing, type, useColors } from "@/lib/theme";
import { useEffort } from "@/lib/workout/effort";
import { type LoadFormat, formatLoad, formatPerformance } from "@/lib/workout/model";

import { StationSwitcher } from "./station-switcher";

// Opens on `stationId` when given, else on the Station last used at `gymId`, or at the current or
// last-used Gym when that's not given either.
export function ExerciseDetail({
  exerciseId,
  stationId: initialStationId,
  gymId,
}: {
  exerciseId: string;
  stationId?: string;
  gymId?: string;
}) {
  const p = useColors();
  const i18n = useI18n();
  const { t } = i18n;
  const [stationId, setStationId] = useState(initialStationId);
  const progress = useExerciseProgress(exerciseId, { stationId, gymId });
  if (!progress) return null;
  const { selected } = progress;

  return (
    <>
      <Stack.Screen options={{ title: progress.name }} />
      {!selected ? (
        <EmptyState message={t.exerciseDetail.noSets} />
      ) : (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
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
              // Keeps the current Station on screen while the next one reads, instead of blanking.
              onSwitch={(id) => startTransition(() => setStationId(id))}
            />
            <Text style={{ color: p.secondary, ...type.footnote }}>
              {t.exerciseDetail.loadsIn(t.unitName[selected.format.unit])}
            </Text>
          </View>
          {selected.workouts.length === 0 ? (
            <Text style={{ color: p.secondary, ...type.body, textAlign: "center" }}>
              {t.exerciseDetail.noWorkingSets}
            </Text>
          ) : (
            <>
              <RepRecordsCard records={selected.repRecords} format={selected.format} />
              {selected.workouts.map((found) => (
                <WorkoutSets key={found.id} workout={found} format={selected.format} />
              ))}
            </>
          )}
        </ScrollView>
      )}
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
