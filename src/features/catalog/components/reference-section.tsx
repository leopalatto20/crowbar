import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import type { Reference } from '@/db';

type ReferenceSectionProps = { title: string; references: Reference[] };

function referenceDate(timestamp: number | undefined): string {
	if (timestamp === undefined) return '';
	return new Date(timestamp).toLocaleDateString();
}

export function ReferenceSection({ title, references }: ReferenceSectionProps) {
	return (
		<Box className="gap-2">
			<Text size="sm" bold>{title}</Text>
			{references.length === 0 ? (
				<Text size="sm" className="text-muted-foreground">None</Text>
			) : references.map((reference) => (
				<Box key={`${title}-${reference.id}`} className="rounded-xl bg-muted px-4 py-2">
					<Text size="sm">
						{title === 'Sessions' && reference.date !== undefined
							? `${reference.name} · ${referenceDate(reference.date)}`
							: reference.name}
					</Text>
				</Box>
			))}
		</Box>
	);
}
