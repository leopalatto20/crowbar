import { useEffect, useState } from 'react';
import { FlatList, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { getDb, listMovements, listMuscleGroups, type CatalogMovement } from '@/db';
import type { MuscleGroupName } from '@/db/constants';

const ALL = 'All' as const;
type Filter = typeof ALL | MuscleGroupName;

/**
 * Catalog browse (issue #7): a flat A–Z screen of movements. Each row shows the
 * movement name and its muscle-group chip; a row of filter chips (All + the 14
 * muscle groups) narrows the list; a name search combines with the active
 * filter; a "show archived" toggle (default off) gates archived rows entirely —
 * they only appear, muted with an "Archived" tag, when revealed. An empty state
 * appears when nothing matches. Volume-landmark numbers never appear here: this
 * is the identity list, not the measurement one.
 */
export default function CatalogScreen() {
	const [groups, setGroups] = useState<MuscleGroupName[]>([]);
	const [filter, setFilter] = useState<Filter>(ALL);
	const [query, setQuery] = useState('');
	const [showArchived, setShowArchived] = useState(false);
	const [rows, setRows] = useState<CatalogMovement[]>([]);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		let cancelled = false;
		listMuscleGroups(getDb())
			.then((gs) => {
				if (!cancelled) setGroups(gs.map((g) => g.name as MuscleGroupName));
			})
			.catch((e) => console.error('Unable to load muscle groups', e));
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		let cancelled = false;
		listMovements(getDb(), {
			muscleGroup: filter === ALL ? undefined : filter,
			query: query.trim() || undefined,
			includeArchived: showArchived,
		})
			.then((ms) => {
				if (!cancelled) {
					setRows(ms);
					setLoaded(true);
				}
			})
			.catch((e) => console.error('Unable to load catalog', e));
		return () => {
			cancelled = true;
		};
	}, [filter, query, showArchived]);

	const empty = loaded && rows.length === 0;

	return (
		<SafeAreaView className="flex-1" edges={['top', 'left', 'right', 'bottom']}>
			<FlatList
				contentContainerClassName="gap-4 px-4 pb-28 pt-4"
				data={rows}
				keyExtractor={(r) => String(r.id)}
				keyboardShouldPersistTaps="handled"
				ListHeaderComponent={
					<Box className="mb-2 gap-4">
						<Text size="5xl" bold>
							Catalog
						</Text>

						<Input className="rounded-xl border-0 bg-card">
							<InputField
								value={query}
								onChangeText={setQuery}
								placeholder="Search movements"
								accessibilityLabel="Search movements"
								autoCorrect={false}
								autoCapitalize="none"
								clearButtonMode="while-editing"
							/>
						</Input>

						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerClassName="gap-2 py-1">
							{([ALL, ...groups] as Filter[]).map((group) => {
								const selected = filter === group;
								return (
									<Button
										key={group}
										onPress={() => setFilter(group)}
										variant={selected ? 'default' : 'outline'}
										size="sm"
										className="rounded-full">
										<ButtonText>{group}</ButtonText>
									</Button>
								);
							})}
						</ScrollView>

						<Box className="flex-row items-center gap-2">
							<Switch
								value={showArchived}
								onValueChange={setShowArchived}
								accessibilityLabel="Show archived"
							/>
							<Text size="sm" className="text-muted-foreground">
								Show archived
							</Text>
						</Box>
					</Box>
				}
				ListEmptyComponent={
					empty ? (
						<Box className="items-center rounded-xl bg-card py-8">
							<Text className="text-muted-foreground">No movements match</Text>
						</Box>
					) : null
				}
				renderItem={({ item }) => <MovementRow movement={item} muted={item.archived} />}
			/>
		</SafeAreaView>
	);
}

function MovementRow({ movement, muted }: { movement: CatalogMovement; muted: boolean }) {
	return (
		<Box className={`mb-2 flex-row items-center gap-2 rounded-xl bg-card px-4 py-4 ${muted ? 'opacity-50' : ''}`}>
			<Text>{movement.name}</Text>
			<Box className="rounded-full bg-background/0 px-2 py-1">
				<Text size="sm" bold className={muted ? 'text-muted-foreground' : 'text-foreground'}>
					{movement.muscleGroup}
				</Text>
			</Box>
			{muted && (
				<Text size="sm" bold className="ml-auto text-muted-foreground uppercase">
					Archived
				</Text>
			)}
		</Box>
	);
}
