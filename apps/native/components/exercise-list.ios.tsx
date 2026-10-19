import {
  Button,
  ContextMenu,
  HStack,
  Host,
  Image,
  List,
  Section,
  Spacer,
  Text,
} from "@expo/ui/swift-ui";
import {
  contentShape,
  onTapGesture,
  scrollDismissesKeyboard,
  shapes,
} from "@expo/ui/swift-ui/modifiers";

import type { ExerciseListing } from "@/db/exercises";
import { useI18n } from "@/lib/i18n";
import { useColors } from "@/lib/theme";

import type { ExerciseActions, ExerciseListProps } from "./exercise-list.types";

// The long-press menu holds every action. Room for the keyboard a header search bar brings up
// comes from the Host's default keyboard safe area.
export function ExerciseList({
  sections,
  onOpenHidden,
  showMenuHint,
  onMenuUse,
  ...actions
}: ExerciseListProps) {
  const p = useColors();
  const { t } = useI18n();
  return (
    <Host style={{ flex: 1 }}>
      <List modifiers={[scrollDismissesKeyboard("immediately")]}>
        {/* On top rather than below the last Muscle group, where a long list would bury it. */}
        {showMenuHint && <Section footer={<Text>{t.exercises.menuHint}</Text>}>{null}</Section>}
        {sections.map(({ key, title, listings }) => (
          <Section key={key} title={title}>
            {listings.map((listing) => (
              <ExerciseRow key={listing.id} listing={listing} onMenuUse={onMenuUse} {...actions} />
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
  onMenuUse,
  onOpen,
  onEdit,
  onToggleHidden,
  onDelete,
}: ExerciseActions & { listing: ExerciseListing; onMenuUse: () => void }) {
  const { t } = useI18n();
  const fromMenu = (action: () => void) => () => {
    onMenuUse();
    action();
  };
  const hideLabel = listing.hidden ? t.exercises.unhide : t.exercises.hide;
  const hideImage = listing.hidden ? "eye" : "eye.slash";
  return (
    <ContextMenu>
      <ContextMenu.Trigger>
        <HStack modifiers={[contentShape(shapes.rectangle()), onTapGesture(() => onOpen(listing))]}>
          <Text>{listing.name}</Text>
          <Spacer />
        </HStack>
      </ContextMenu.Trigger>
      <ContextMenu.Items>
        {!listing.builtIn && (
          <Button
            label={t.exercises.edit}
            systemImage="pencil"
            onPress={fromMenu(() => onEdit(listing))}
          />
        )}
        <Button
          label={hideLabel}
          systemImage={hideImage}
          onPress={fromMenu(() => onToggleHidden(listing))}
        />
        {!listing.builtIn && (
          <Button
            label={t.exercises.delete}
            systemImage="trash"
            role="destructive"
            onPress={fromMenu(() => onDelete(listing))}
          />
        )}
      </ContextMenu.Items>
    </ContextMenu>
  );
}
