import {
  DropdownMenu,
  DropdownMenuItem,
  Host,
  LazyColumn,
  ListItem,
  Text,
} from "@expo/ui/jetpack-compose";
import { clickable, combinedClickable, padding } from "@expo/ui/jetpack-compose/modifiers";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { ScrollView, Text as RNText, View } from "react-native";

import { ReorderableList } from "@/components/reorderable-list";
import type { RoutineListing } from "@/db/routines";
import { useI18n } from "@/lib/i18n";
import { formatLastRun } from "@/lib/routine/model";
import { spacing, type, useColors } from "@/lib/theme";

import type { RoutineListProps } from "./routine-list.types";

export function RoutineList(props: RoutineListProps) {
  return props.editing ? <ReorderRoutines {...props} /> : <RoutineMenuList {...props} />;
}

function RoutineMenuList({
  routines,
  onStartEmptyWorkout,
  onStart,
  onCreate,
  onEdit,
  onDuplicate,
  onDelete,
}: RoutineListProps) {
  const p = useColors();
  const { t } = useI18n();
  return (
    <Host style={{ flex: 1 }}>
      <LazyColumn>
        <ListItem modifiers={[clickable(onStartEmptyWorkout)]}>
          <ListItem.HeadlineContent>
            <Text color={p.blue}>{t.workoutTab.startEmptyWorkout}</Text>
          </ListItem.HeadlineContent>
        </ListItem>
        <Text
          color={p.secondary}
          style={{ typography: "labelLarge" }}
          modifiers={[padding(16, 16, 16, 8)]}
        >
          {t.workoutTab.routines}
        </Text>
        {routines.length === 0 ? (
          <ListItem modifiers={[clickable(onCreate)]}>
            <ListItem.HeadlineContent>
              <Text color={p.secondary}>{t.workoutTab.createFirstRoutine}</Text>
            </ListItem.HeadlineContent>
          </ListItem>
        ) : (
          routines.map((routine) => (
            <RoutineRow
              key={routine.id}
              routine={routine}
              onStart={onStart}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          ))
        )}
      </LazyColumn>
    </Host>
  );
}

function RoutineRow({
  routine,
  onStart,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  routine: RoutineListing;
  onStart: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (routine: RoutineListing) => void;
  onDelete: (id: string) => void;
}) {
  const i18n = useI18n();
  const { t } = i18n;
  const p = useColors();
  const [menu, setMenu] = useState(false);
  const item = (label: string, action: () => void) => (
    <DropdownMenuItem
      onClick={() => {
        setMenu(false);
        action();
      }}
    >
      <DropdownMenuItem.Text>
        <Text>{label}</Text>
      </DropdownMenuItem.Text>
    </DropdownMenuItem>
  );
  return (
    <DropdownMenu expanded={menu} onDismissRequest={() => setMenu(false)}>
      <DropdownMenu.Trigger>
        <ListItem
          modifiers={[
            combinedClickable({
              onClick: () => onStart(routine.id),
              onLongClick: () => setMenu(true),
            }),
          ]}
        >
          <ListItem.HeadlineContent>
            <Text>{routine.name}</Text>
          </ListItem.HeadlineContent>
          {routine.lastRun && (
            <ListItem.SupportingContent>
              <Text color={p.secondary}>{formatLastRun(routine.lastRun, i18n)}</Text>
            </ListItem.SupportingContent>
          )}
        </ListItem>
      </DropdownMenu.Trigger>
      <DropdownMenu.Items>
        {item(t.workoutTab.edit, () => onEdit(routine.id))}
        {item(t.workoutTab.duplicate, () => onDuplicate(routine))}
        {item(t.workoutTab.delete, () => onDelete(routine.id))}
      </DropdownMenu.Items>
    </DropdownMenu>
  );
}

// Compose has no reorderable list, so Edit mode swaps in the drag list the Routine editor uses.
function ReorderRoutines({ routines, onReorder }: RoutineListProps) {
  const p = useColors();
  return (
    <ScrollView style={{ backgroundColor: p.background }}>
      <ReorderableList
        items={routines}
        keyOf={(routine) => routine.id}
        onReorder={onReorder}
        renderItem={(routine, handle) => (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              minHeight: 56,
              paddingHorizontal: spacing.xl,
              backgroundColor: p.background,
            }}
          >
            <RNText style={{ flex: 1, color: p.label, ...type.body }}>{routine.name}</RNText>
            {handle(
              <SymbolView
                name={{ ios: "line.3.horizontal", android: "drag_handle" }}
                size={22}
                tintColor={p.tertiary}
              />,
            )}
          </View>
        )}
      />
    </ScrollView>
  );
}
