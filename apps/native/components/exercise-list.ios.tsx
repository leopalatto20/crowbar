import {
  Button,
  ContextMenu,
  HStack,
  Host,
  Image,
  List,
  Section,
  Spacer,
  SwipeActions,
  Text,
} from "@expo/ui/swift-ui";
import {
  contentShape,
  deleteDisabled,
  onTapGesture,
  shapes,
  tint,
} from "@expo/ui/swift-ui/modifiers";

import type { ExerciseListing } from "@/db/exercises";
import { useI18n } from "@/lib/i18n";
import { useColors } from "@/lib/theme";

import type { ExerciseListProps } from "./exercise-list.types";

// Hide and Unhide wait behind the swipe; the long-press menu holds every action.
export function ExerciseList({ sections, onOpenHidden, ...actions }: ExerciseListProps) {
  const p = useColors();
  const { t } = useI18n();
  return (
    <Host style={{ flex: 1 }}>
      <List>
        {sections.map(({ key, title, listings }) => (
          <Section key={key} title={title}>
            {listings.map((listing) => (
              <ExerciseRow key={listing.id} listing={listing} {...actions} />
            ))}
          </Section>
        ))}
        {onOpenHidden && (
          <Section>
            <HStack modifiers={[contentShape(shapes.rectangle()), onTapGesture(onOpenHidden)]}>
              <Text>{t.exercises.hiddenExercises}</Text>
              <Spacer />
              <Image systemName="chevron.right" size={13} color={p.tertiary} />
            </HStack>
          </Section>
        )}
      </List>
    </Host>
  );
}

function ExerciseRow({
  listing,
  onEdit,
  onToggleHidden,
  onDelete,
}: Omit<ExerciseListProps, "sections" | "onOpenHidden"> & { listing: ExerciseListing }) {
  const p = useColors();
  const { t } = useI18n();
  const hideLabel = listing.hidden ? t.exercises.unhide : t.exercises.hide;
  const hideImage = listing.hidden ? "eye" : "eye.slash";
  return (
    <SwipeActions modifiers={[deleteDisabled()]}>
      <ContextMenu>
        <ContextMenu.Trigger>
          <HStack modifiers={[contentShape(shapes.rectangle())]}>
            <Text>{listing.name}</Text>
            <Spacer />
          </HStack>
        </ContextMenu.Trigger>
        <ContextMenu.Items>
          {!listing.builtIn && (
            <Button label={t.exercises.edit} systemImage="pencil" onPress={() => onEdit(listing)} />
          )}
          <Button
            label={hideLabel}
            systemImage={hideImage}
            onPress={() => onToggleHidden(listing)}
          />
          {!listing.builtIn && (
            <Button
              label={t.exercises.delete}
              systemImage="trash"
              role="destructive"
              onPress={() => onDelete(listing)}
            />
          )}
        </ContextMenu.Items>
      </ContextMenu>
      <SwipeActions.Actions edge="trailing">
        <Button
          label={hideLabel}
          systemImage={hideImage}
          onPress={() => onToggleHidden(listing)}
          modifiers={[tint(p.orange)]}
        />
      </SwipeActions.Actions>
    </SwipeActions>
  );
}
