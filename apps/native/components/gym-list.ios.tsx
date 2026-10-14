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
  onTapGesture,
  shapes,
  tint,
} from "@expo/ui/swift-ui/modifiers";

import { useI18n } from "@/lib/i18n";
import { useColors } from "@/lib/theme";

import type { GymListProps } from "./gym-list.types";

// A tap renames; Delete waits behind the swipe and the long-press menu, both ending in a confirm.
export function GymList({ gyms, onRename, onDelete }: GymListProps) {
  const p = useColors();
  const { t } = useI18n();
  return (
    <Host style={{ flex: 1 }}>
      <List>
        <Section>
          {gyms.map((gym) => (
            <SwipeActions key={gym.id} modifiers={[deleteDisabled()]}>
              <ContextMenu>
                <ContextMenu.Trigger>
                  <HStack
                    modifiers={[
                      contentShape(shapes.rectangle()),
                      onTapGesture(() => onRename(gym)),
                    ]}
                  >
                    <Text>{gym.name}</Text>
                    <Spacer />
                  </HStack>
                </ContextMenu.Trigger>
                <ContextMenu.Items>
                  <Button
                    label={t.gyms.rename}
                    systemImage="pencil"
                    onPress={() => onRename(gym)}
                  />
                  <Button
                    label={t.gyms.delete}
                    systemImage="trash"
                    role="destructive"
                    onPress={() => onDelete(gym)}
                  />
                </ContextMenu.Items>
              </ContextMenu>
              <SwipeActions.Actions edge="trailing">
                <Button
                  label={t.gyms.delete}
                  systemImage="trash"
                  onPress={() => onDelete(gym)}
                  modifiers={[tint(p.red)]}
                />
                <Button
                  label={t.gyms.rename}
                  systemImage="pencil"
                  onPress={() => onRename(gym)}
                  modifiers={[tint(p.blue)]}
                />
              </SwipeActions.Actions>
            </SwipeActions>
          ))}
        </Section>
      </List>
    </Host>
  );
}
