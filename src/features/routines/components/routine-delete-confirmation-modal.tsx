import { Modal } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { RoutineSummary } from '@/db';

type RoutineDeleteConfirmationModalProps = {
	routine: RoutineSummary | null;
	onCancel: () => void;
	onConfirm: () => void;
};

export function RoutineDeleteConfirmationModal({ routine, onCancel, onConfirm }: RoutineDeleteConfirmationModalProps) {
	return (
		<Modal visible={routine !== null} transparent animationType="fade" onRequestClose={onCancel}>
			<Box className="flex-1 items-center justify-center bg-foreground/40 px-4">
				<Box className="w-full max-w-[480px] gap-4 rounded-xl bg-popover p-4">
					<Text size="2xl" className="font-semibold">Delete Routine?</Text>
					{routine && <Text className="text-muted-foreground">Delete {routine.name} permanently? This cannot be undone.</Text>}
					<Box className="flex-row justify-end gap-2">
						<Button variant="outline" onPress={onCancel} accessibilityLabel="Cancel Routine deletion">
							<ButtonText>Cancel</ButtonText>
						</Button>
						<Button variant="destructive" onPress={onConfirm} accessibilityLabel="Confirm Routine deletion">
							<ButtonText>Delete</ButtonText>
						</Button>
					</Box>
				</Box>
			</Box>
		</Modal>
	);
}
