import {
  DropdownMenu,
  DropdownMenuItem,
  Host,
  LazyColumn,
  ListItem,
  Text,
} from "@expo/ui/jetpack-compose";
import { clickable, padding } from "@expo/ui/jetpack-compose/modifiers";
import { useState } from "react";

import type { ExerciseListing } from "@/db/exercises";
import { useI18n } from "@/lib/i18n";
import { useColors } from "@/lib/theme";

import type { ExerciseListProps } from "./exercise-list.types";

// A tap opens the row's menu: Compose has no swipe actions to put Hide behind.
export function ExerciseList({ sections, onOpenHidden, ...actions }: ExerciseListProps) {
  const p = useColors();
  const { t } = useI18n();
  return (
    <Host style={{ flex: 1 }}>
      <LazyColumn>
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
  onEdit,
  onToggleHidden,
  onDelete,
}: Omit<ExerciseListProps, "sections" | "onOpenHidden"> & { listing: ExerciseListing }) {
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
        <ListItem modifiers={[clickable(() => setMenu(true))]}>
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
