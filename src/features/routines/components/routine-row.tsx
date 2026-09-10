import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { RoutineSummary } from '@/db';

type RoutineRowProps = {
	routine: RoutineSummary;
	expanded: boolean;
	archiveBusy: boolean;
	onOpen: () => void;
	onMore: () => void;
	onArchive: () => void;
	onDelete: () => void;
};

export function RoutineRow({ routine, expanded, archiveBusy, onOpen, onMore, onArchive, onDelete }: RoutineRowProps) {
	return (
		<Box className={`rounded-xl bg-card ${routine.archived ? 'opacity-50' : ''}`}>
			<Box className="flex-row items-center gap-2 px-4 py-4">
				<Button
					variant="ghost"
					className="min-w-0 flex-1 justify-start px-0 py-0"
					onPress={onOpen}
					accessibilityLabel={`Edit ${routine.name}`}
				>
					<ButtonText className="min-w-0 flex-1 justify-start text-left text-base" numberOfLines={1}>{routine.name}</ButtonText>
				</Button>
				<Text size="sm" className="text-muted-foreground">{movementCountLabel(routine.movementCount)}</Text>
				<Button
					variant="outline"
					onPress={onMore}
					accessibilityLabel={`${expanded ? 'Hide' : 'Show'} actions for ${routine.name}`}
				>
					<ButtonText>{expanded ? 'Close' : 'More'}</ButtonText>
				</Button>
				{routine.archived && <Text size="xs" bold className="uppercase text-muted-foreground">Archived</Text>}
			</Box>
			{expanded && (
				<Box className="flex-row flex-wrap gap-2 px-4 pb-4">
					<Button variant="outline" onPress={onArchive} disabled={archiveBusy} accessibilityLabel={routine.archived ? `Un-archive ${routine.name}` : `Archive ${routine.name}`}>
						<ButtonText>{archiveBusy ? 'Saving…' : routine.archived ? 'Un-archive' : 'Archive'}</ButtonText>
					</Button>
					<Button variant="destructive" onPress={onDelete} accessibilityLabel={`Delete ${routine.name}`}>
						<ButtonText>Delete</ButtonText>
					</Button>
				</Box>
			)}
		</Box>
	);
}

function movementCountLabel(count: number): string {
	return `${count} ${count === 1 ? 'Movement' : 'Movements'}`;
}
