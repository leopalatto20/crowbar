import { Modal, Pressable, ScrollView } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { MovementDeleteReferences } from '@/db';
import { ReferenceSection } from './reference-section';

type ReferencesModalProps = {
	panel: { movementName: string; references: MovementDeleteReferences } | null;
	onClose: () => void;
};

export function ReferencesModal({ panel, onClose }: ReferencesModalProps) {
	return (
		<Modal visible={panel !== null} transparent animationType="slide" onRequestClose={onClose}>
			<Box className="flex-1 justify-end bg-foreground/40">
				<Pressable className="absolute inset-0" onPress={onClose} />
				<Box className="max-h-[85%] gap-4 rounded-t-xl bg-popover px-4 pb-8 pt-4">
					<Box className="flex-row items-center justify-between gap-2">
						<Text size="2xl" className="font-semibold">Cannot delete movement</Text>
						<Button variant="ghost" onPress={onClose} accessibilityLabel="Close references">
							<ButtonText>Close</ButtonText>
						</Button>
					</Box>
					{panel && (
						<ScrollView contentContainerClassName="gap-4" keyboardShouldPersistTaps="handled">
							<Text className="text-muted-foreground">
								{panel.movementName} still has references that must remain intact.
							</Text>
							<ReferenceSection title="Routines" references={panel.references.routines} />
							<ReferenceSection title="Sub-routines" references={panel.references.subRoutines} />
							<ReferenceSection title="Sessions" references={panel.references.sessions} />
							<Box className="gap-2">
								<Text size="sm" bold>Set history</Text>
								<Text className="text-muted-foreground">{panel.references.sets} set(s) recorded</Text>
							</Box>
						</ScrollView>
					)}
				</Box>
			</Box>
		</Modal>
	);
}
