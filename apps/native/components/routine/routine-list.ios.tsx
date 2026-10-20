import {
  Button,
  ContextMenu,
  HStack,
  Host,
  List,
  Section,
  Spacer,
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
import { type } from "@/lib/theme";

import type { RoutineListProps } from "./routine-list.types";

export function RoutineList({
  routines,
  editing,
  showMenuHint,
  onMenuUse,
  onStartEmptyWorkout,
  onStart,
  onCreate,
  onEdit,
  onShare,
  onDuplicate,
  onDelete,
  onReorder,
}: RoutineListProps) {
  const i18n = useI18n();
  const { t } = i18n;
  const ids = routines.map((routine) => routine.id);
  const fromMenu = (action: () => void) => () => {
    onMenuUse();
    action();
  };

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
        <Section
          title={t.workoutTab.routines}
          footer={
            // Edit mode drops the menu, so the hint would point at nothing.
            showMenuHint && !editing && routines.length > 0 ? (
              <Text>{t.workoutTab.menuHint}</Text>
            ) : undefined
          }
        >
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
                    key={routine.id}
                    modifiers={[
                      deleteDisabled(),
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
                // List.ForEach always offers swipe-to-delete; Delete lives in the menu instead.
                // Edit mode is for ordering, so the menu sits it out: SwiftUI never calls onMove
                // for a row carrying a contextMenu, nor for one wrapped in a Group.
                if (editing) return row;
                return (
                  <ContextMenu key={routine.id} modifiers={[deleteDisabled()]}>
                    <ContextMenu.Trigger>{row}</ContextMenu.Trigger>
                    <ContextMenu.Items>
                      <Button
                        label={t.workoutTab.edit}
                        systemImage="pencil"
                        onPress={fromMenu(() => onEdit(routine.id))}
                      />
                      <Button
                        label={t.workoutTab.share}
                        systemImage="square.and.arrow.up"
                        onPress={fromMenu(() => onShare(routine))}
                      />
                      <Button
                        label={t.workoutTab.duplicate}
                        systemImage="plus.square.on.square"
                        onPress={fromMenu(() => onDuplicate(routine))}
                      />
                      <Button
                        label={t.workoutTab.delete}
                        systemImage="trash"
                        role="destructive"
                        onPress={fromMenu(() => onDelete(routine))}
                      />
                    </ContextMenu.Items>
                  </ContextMenu>
                );
              })}
            </List.ForEach>
          )}
        </Section>
      </List>
    </Host>
  );
}
