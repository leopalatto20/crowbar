import {
  DropdownMenu,
  DropdownMenuItem,
  Host,
  LazyColumn,
  ListItem,
  Text,
} from "@expo/ui/jetpack-compose";
import {
  clickable,
  combinedClickable,
  imePadding,
  padding,
} from "@expo/ui/jetpack-compose/modifiers";
import { useState } from "react";

import type { ExerciseListing } from "@/db/exercises";
import { useI18n } from "@/lib/i18n";
import { useColors } from "@/lib/theme";

import type { ExerciseActions, ExerciseListProps } from "./exercise-list.types";

// A long press opens the row's menu, which holds every action. The Host doesn't pad its content
// for the keyboard, so the list does it to stay scrollable above it.
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
      <LazyColumn modifiers={[imePadding()]}>
        {/* On top rather than below the last Muscle group, where a long list would bury it. */}
        {showMenuHint && (
          <Text
            color={p.secondary}
            style={{ typography: "bodySmall" }}
            modifiers={[padding(16, 8, 16, 0)]}
          >
            {t.exercises.menuHint}
          </Text>
        )}
        {sections.flatMap(({ key, title, listings }) => [
          <Text
            key={key}
            color={p.secondary}
            style={{ typography: "labelLarge" }}
            modifiers={[padding(16, 16, 16, 8)]}
          >
            {title}
          </Text>,
          ...listings.map((listing) => (
            <ExerciseRow key={listing.id} listing={listing} onMenuUse={onMenuUse} {...actions} />
          )),
        ])}
        {onOpenHidden && (
          <ListItem modifiers={[clickable(onOpenHidden)]}>
            <ListItem.HeadlineContent>
              <Text>{t.exercises.hiddenExercises}</Text>
            </ListItem.HeadlineContent>
          </ListItem>
        )}
      </LazyColumn>
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
  const [menu, setMenu] = useState(false);
  const item = (label: string, action: () => void) => (
    <DropdownMenuItem
      onClick={() => {
        setMenu(false);
        onMenuUse();
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
            combinedClickable({ onClick: () => onOpen(listing), onLongClick: () => setMenu(true) }),
          ]}
        >
          <ListItem.HeadlineContent>
            <Text>{listing.name}</Text>
          </ListItem.HeadlineContent>
        </ListItem>
      </DropdownMenu.Trigger>
      <DropdownMenu.Items>
        {!listing.builtIn && item(t.exercises.edit, () => onEdit(listing))}
        {item(listing.hidden ? t.exercises.unhide : t.exercises.hide, () =>
          onToggleHidden(listing),
        )}
        {!listing.builtIn && item(t.exercises.delete, () => onDelete(listing))}
      </DropdownMenu.Items>
    </DropdownMenu>
  );
}
