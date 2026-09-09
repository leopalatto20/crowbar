import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { CatalogMovement } from '@/db';

type MovementRowProps = {
	movement: CatalogMovement;
	expanded: boolean;
	deleteBlocked: boolean;
	archiveBusy: boolean;
	onOpen: () => void;
	onMore: () => void;
	onArchive: () => void;
	onDelete: () => void;
	onShowReferences: () => void;
};

export function MovementRow({
	movement,
	expanded,
	deleteBlocked,
	archiveBusy,
	onOpen,
	onMore,
	onArchive,
	onDelete,
	onShowReferences,
}: MovementRowProps) {
	return (
		<Box className={`rounded-xl bg-card ${movement.archived ? 'opacity-50' : ''}`}>
			<Box className="flex-row items-center gap-2 px-4 py-4">
				<Button
					variant="ghost"
					className="min-w-0 flex-1 justify-start px-0 py-0"
					onPress={onOpen}
					accessibilityLabel={`Edit ${movement.name}`}>
					<Box className="min-w-0 flex-1 gap-1">
						<ButtonText className="text-left text-base">{movement.name}</ButtonText>
						<Box className="self-start rounded-full bg-muted px-2 py-0.5">
							<Text size="sm" className="text-muted-foreground">{movement.muscleGroup}</Text>
						</Box>
					</Box>
				</Button>
				<Button
					variant="outline"
					onPress={onMore}
					accessibilityLabel={`${expanded ? 'Hide' : 'Show'} actions for ${movement.name}`}>
					<ButtonText>{expanded ? 'Close' : 'More'}</ButtonText>
				</Button>
				{movement.archived && (
					<Text size="xs" bold className="text-muted-foreground uppercase">Archived</Text>
				)}
			</Box>
			{expanded && (
				<Box className="flex-row flex-wrap items-center gap-2 px-4 pb-4">
					<Button
						variant="outline"
						onPress={onArchive}
						disabled={archiveBusy}
						accessibilityLabel={movement.archived ? `Un-archive ${movement.name}` : `Archive ${movement.name}`}>
						<ButtonText>{archiveBusy ? 'Saving…' : movement.archived ? 'Un-archive' : 'Archive'}</ButtonText>
					</Button>
					<Button
						variant="destructive"
						disabled={deleteBlocked}
						onPress={onDelete}
						accessibilityLabel={`Delete ${movement.name}`}>
						<ButtonText>Delete</ButtonText>
					</Button>
					{deleteBlocked && (
						<Button variant="outline" onPress={onShowReferences} accessibilityLabel={`Show references for ${movement.name}`}>
							<ButtonText>Show references</ButtonText>
						</Button>
					)}
				</Box>
			)}
		</Box>
	);
}
