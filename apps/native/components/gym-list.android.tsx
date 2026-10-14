import {
  DropdownMenu,
  DropdownMenuItem,
  Host,
  LazyColumn,
  ListItem,
  Text,
} from "@expo/ui/jetpack-compose";
import { combinedClickable } from "@expo/ui/jetpack-compose/modifiers";
import { useState } from "react";

import type { Gym } from "@/db/gyms";
import { useI18n } from "@/lib/i18n";

import type { GymListProps } from "./gym-list.types";

// A tap renames; Delete waits behind the long-press menu and then a confirm.
export function GymList({ gyms, onRename, onDelete }: GymListProps) {
  return (
    <Host style={{ flex: 1 }}>
      <LazyColumn>
        {gyms.map((gym) => (
          <GymRow key={gym.id} gym={gym} onRename={onRename} onDelete={onDelete} />
        ))}
      </LazyColumn>
    </Host>
  );
}

function GymRow({
  gym,
  onRename,
  onDelete,
}: {
  gym: Gym;
  onRename: (gym: Gym) => void;
  onDelete: (gym: Gym) => void;
}) {
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
            combinedClickable({ onClick: () => onRename(gym), onLongClick: () => setMenu(true) }),
          ]}
        >
          <ListItem.HeadlineContent>
            <Text>{gym.name}</Text>
          </ListItem.HeadlineContent>
        </ListItem>
      </DropdownMenu.Trigger>
      <DropdownMenu.Items>
        {item(t.gyms.rename, () => onRename(gym))}
        {item(t.gyms.delete, () => onDelete(gym))}
      </DropdownMenu.Items>
    </DropdownMenu>
  );
}
