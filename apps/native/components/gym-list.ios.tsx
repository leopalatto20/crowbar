import { Button, ContextMenu, HStack, Host, List, Section, Spacer, Text } from "@expo/ui/swift-ui";
import { contentShape, onTapGesture, shapes } from "@expo/ui/swift-ui/modifiers";

import { useI18n } from "@/lib/i18n";

import type { GymListProps } from "./gym-list.types";

// A tap renames; Delete waits in the long-press menu and ends in a confirm.
export function GymList({ gyms, onRename, onDelete }: GymListProps) {
  const { t } = useI18n();
  return (
    <Host style={{ flex: 1 }}>
      <List>
        <Section>
          {gyms.map((gym) => (
            <ContextMenu key={gym.id}>
              <ContextMenu.Trigger>
                <HStack
                  modifiers={[contentShape(shapes.rectangle()), onTapGesture(() => onRename(gym))]}
                >
                  <Text>{gym.name}</Text>
                  <Spacer />
                </HStack>
              </ContextMenu.Trigger>
              <ContextMenu.Items>
                <Button label={t.gyms.rename} systemImage="pencil" onPress={() => onRename(gym)} />
                <Button
                  label={t.gyms.delete}
                  systemImage="trash"
                  role="destructive"
                  onPress={() => onDelete(gym)}
                />
              </ContextMenu.Items>
            </ContextMenu>
          ))}
        </Section>
      </List>
    </Host>
  );
}
