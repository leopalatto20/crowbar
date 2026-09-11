import { Modal, Pressable, ScrollView } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { Reference, RoutineDeleteReferences } from '@/db';

type RoutineReferencesModalProps = {
  panel: { routineName: string; references: RoutineDeleteReferences } | null;
  onClose: () => void;
};

export function RoutineReferencesModal({ panel, onClose }: RoutineReferencesModalProps) {
  return (
    <Modal visible={panel !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Box className="flex-1 justify-end bg-foreground/40">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <Box className="max-h-[85%] gap-4 rounded-t-xl bg-popover px-4 pb-8 pt-4">
          <Box className="flex-row items-center justify-between gap-2">
            <Text size="2xl" className="font-semibold">
              Cannot delete Routine
            </Text>
            <Button variant="ghost" onPress={onClose} accessibilityLabel="Close Routine references">
              <ButtonText>Close</ButtonText>
            </Button>
          </Box>
          {panel && (
            <ScrollView contentContainerClassName="gap-4" keyboardShouldPersistTaps="handled">
              <Text className="text-muted-foreground">
                {panel.routineName} still has references that must remain intact.
              </Text>
              <ReferenceSection title="Sub-routines" references={panel.references.subRoutines} />
              <ReferenceSection title="Session history" references={panel.references.sessions} />
            </ScrollView>
          )}
        </Box>
      </Box>
    </Modal>
  );
}

function ReferenceSection({ title, references }: { title: string; references: Reference[] }) {
  return (
    <Box className="gap-2">
      <Text size="sm" bold>
        {title}
      </Text>
      {references.length === 0 ? (
        <Text size="sm" className="text-muted-foreground">
          None
        </Text>
      ) : (
        references.map((reference) => (
          <Box key={`${title}-${reference.id}`} className="rounded-xl bg-muted px-4 py-2">
            <Text size="sm">
              {title === 'Session history' && reference.date !== undefined
                ? `${reference.name} · ${referenceDate(reference.date)}`
                : reference.name}
            </Text>
          </Box>
        ))
      )}
    </Box>
  );
}

function referenceDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}
