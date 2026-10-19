import { Button, ContextMenu, HStack, Host, List, Section, Spacer, Text } from "@expo/ui/swift-ui";
import { contentShape, onTapGesture, shapes } from "@expo/ui/swift-ui/modifiers";

import { useI18n } from "@/lib/i18n";

import type { GymListProps } from "./gym-list.types";

// A tap renames; Delete waits in the long-press menu and ends in a confirm.
export function GymList({ gyms, showMenuHint, onMenuUse, onRename, onDelete }: GymListProps) {
  const { t } = useI18n();
  const fromMenu = (action: () => void) => () => {
    onMenuUse();
    action();
  };
  return (
    <Host style={{ flex: 1 }}>
      <List>
        <Section
          footer={showMenuHint && gyms.length > 0 ? <Text>{t.gyms.menuHint}</Text> : undefined}
        >
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
                <Button
                  label={t.gyms.rename}
                  systemImage="pencil"
                  onPress={fromMenu(() => onRename(gym))}
                />
                <Button
                  label={t.gyms.delete}
                  systemImage="trash"
                  role="destructive"
                  onPress={fromMenu(() => onDelete(gym))}
                />
              </ContextMenu.Items>
            </ContextMenu>
          ))}
        </Section>
      </List>
    </Host>
  );
}
