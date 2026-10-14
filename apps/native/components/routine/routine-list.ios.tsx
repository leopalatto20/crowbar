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
} from "@expo/ui/swift-ui";
import {
  contentShape,
  deleteDisabled,
  environment,
  shapes,
  tint,
} from "@expo/ui/swift-ui/modifiers";

import { useI18n } from "@/lib/i18n";
import { move } from "@/lib/routine/model";
import { useColors } from "@/lib/theme";

import type { RoutineListProps } from "./routine-list.types";

export function RoutineList({
  routines,
  editing,
  onStartEmptyWorkout,
  onCreate,
  onEdit,
  onDuplicate,
  onDelete,
  onReorder,
}: RoutineListProps) {
  const p = useColors();
  const { t } = useI18n();
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
              {routines.map((routine) => (
                // Edit mode is for ordering; Delete stays behind the long-press menu.
                <SwipeActions key={routine.id} modifiers={[deleteDisabled()]}>
                  <ContextMenu>
                    <ContextMenu.Trigger>
                      {/* The whole row answers the long-press, not just the name. */}
                      <HStack modifiers={[contentShape(shapes.rectangle())]}>
                        <Text>{routine.name}</Text>
                        <Spacer />
                      </HStack>
                    </ContextMenu.Trigger>
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
                        onPress={() => onDelete(routine.id)}
                      />
                    </ContextMenu.Items>
                  </ContextMenu>
                  <SwipeActions.Actions edge="trailing">
                    <Button
                      label={t.workoutTab.edit}
                      systemImage="pencil"
                      onPress={() => onEdit(routine.id)}
                      modifiers={[tint(p.blue)]}
                    />
                  </SwipeActions.Actions>
                </SwipeActions>
              ))}
            </List.ForEach>
          )}
        </Section>
      </List>
    </Host>
  );
}
