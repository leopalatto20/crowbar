import { Modal } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

type UnsavedChangesModalProps = {
  visible: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
};

export function UnsavedChangesModal({
  visible,
  onKeepEditing,
  onDiscard,
}: UnsavedChangesModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onKeepEditing}>
      <Box className="flex-1 items-center justify-center bg-foreground/40 px-4">
        <Box className="w-full max-w-[480px] gap-4 rounded-xl bg-popover p-4">
          <Text size="2xl" className="font-semibold">
            Discard changes?
          </Text>
          <Text className="text-muted-foreground">Your edits haven’t been saved.</Text>
          <Box className="flex-row justify-end gap-2">
            <Button variant="outline" onPress={onKeepEditing} accessibilityLabel="Keep editing">
              <ButtonText>Keep editing</ButtonText>
            </Button>
            <Button variant="destructive" onPress={onDiscard} accessibilityLabel="Discard changes">
              <ButtonText>Discard</ButtonText>
            </Button>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
}
