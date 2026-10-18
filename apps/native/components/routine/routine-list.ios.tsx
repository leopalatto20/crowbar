import {
  Button,
  ContextMenu,
  HStack,
  Host,
  List,
  Section,
  Spacer,
  SwipeActions,
  Text,
  VStack,
} from "@expo/ui/swift-ui";
import {
  contentShape,
  deleteDisabled,
  environment,
  font,
  foregroundStyle,
  onTapGesture,
  shapes,
  tint,
} from "@expo/ui/swift-ui/modifiers";

import { useI18n } from "@/lib/i18n";
import { formatLastRun, move } from "@/lib/routine/model";
import { type, useColors } from "@/lib/theme";

import type { RoutineListProps } from "./routine-list.types";

export function RoutineList({
  routines,
  editing,
  onStartEmptyWorkout,
  onStart,
  onCreate,
  onEdit,
  onDuplicate,
  onDelete,
  onReorder,
}: RoutineListProps) {
  const p = useColors();
  const i18n = useI18n();
  const { t } = i18n;
  const ids = routines.map((routine) => routine.id);

  return (
    <Host style={{ flex: 1 }}>
      <List modifiers={[environment("editMode", editing ? "active" : "inactive")]}>
        <Section>
          <Button
            label={t.workoutTab.startEmptyWorkout}
            systemImage="plus.circle.fill"
            onPress={onStartEmptyWorkout}
          />
        </Section>
        <Section title={t.workoutTab.routines}>
          {routines.length === 0 ? (
            <Button
              label={t.workoutTab.createFirstRoutine}
              onPress={onCreate}
              modifiers={[tint({ type: "hierarchical", style: "secondary" })]}
            />
          ) : (
            <List.ForEach
              onMove={(sources, destination) => onReorder(move(ids, sources, destination))}
            >
              {routines.map((routine) => {
                // The whole row answers the tap and long-press, not just the name.
                // In Edit mode a tap would start a Workout mid-reorder.
                const row = (
                  <HStack
                    modifiers={[
                      contentShape(shapes.rectangle()),
                      ...(editing ? [] : [onTapGesture(() => onStart(routine.id))]),
                    ]}
                  >
                    <VStack alignment="leading" spacing={2}>
                      <Text>{routine.name}</Text>
                      {routine.lastRun && (
                        <Text
                          modifiers={[
                            font({ size: type.footnote.fontSize }),
                            foregroundStyle({ type: "hierarchical", style: "secondary" }),
                          ]}
                        >
                          {formatLastRun(routine.lastRun, i18n)}
                        </Text>
                      )}
                    </VStack>
                    <Spacer />
                  </HStack>
                );
                return (
                  // Edit mode is for ordering, so Delete and the long-press menu sit it out:
                  // SwiftUI never calls onMove for a row carrying a contextMenu.
                  <SwipeActions key={routine.id} modifiers={[deleteDisabled()]}>
                    {editing ? (
                      row
                    ) : (
                      <ContextMenu>
                        <ContextMenu.Trigger>{row}</ContextMenu.Trigger>
                        <ContextMenu.Items>
                          <Button
                            label={t.workoutTab.edit}
                            systemImage="pencil"
                            onPress={() => onEdit(routine.id)}
                          />
                          <Button
                            label={t.workoutTab.duplicate}
                            systemImage="plus.square.on.square"
                            onPress={() => onDuplicate(routine)}
                          />
                          <Button
                            label={t.workoutTab.delete}
                            systemImage="trash"
                            role="destructive"
                            onPress={() => onDelete(routine)}
                          />
                        </ContextMenu.Items>
                      </ContextMenu>
                    )}
                    <SwipeActions.Actions edge="trailing">
                      <Button
                        label={t.workoutTab.edit}
                        systemImage="pencil"
                        onPress={() => onEdit(routine.id)}
                        modifiers={[tint(p.blue)]}
                      />
                    </SwipeActions.Actions>
                  </SwipeActions>
                );
              })}
            </List.ForEach>
          )}
        </Section>
      </List>
    </Host>
  );
}
