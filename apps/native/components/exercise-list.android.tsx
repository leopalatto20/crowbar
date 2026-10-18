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

// A long press opens the row's menu: Compose has no swipe actions to put Hide behind. The Host
// only sizes its viewport around the keyboard, so the list pads itself to stay above it.
export function ExerciseList({ sections, onOpenHidden, ...actions }: ExerciseListProps) {
  const p = useColors();
  const { t } = useI18n();
  return (
    <Host style={{ flex: 1 }}>
      <LazyColumn modifiers={[imePadding()]}>
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
            <ExerciseRow key={listing.id} listing={listing} {...actions} />
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
  onOpen,
  onEdit,
  onToggleHidden,
  onDelete,
}: ExerciseActions & { listing: ExerciseListing }) {
  const { t } = useI18n();
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
