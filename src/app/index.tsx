import { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { getDb, listMovements, listMuscleGroups, type CatalogMovement } from '@/db';
import { MovementEditorModal } from '@/components/movement-editor-modal';
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
	const [groups, setGroups] = useState<{ id: number; name: MuscleGroupName }[]>([]);
	const [filter, setFilter] = useState<Filter>(ALL);
	const [query, setQuery] = useState('');
	const [showArchived, setShowArchived] = useState(false);
	const [rows, setRows] = useState<CatalogMovement[]>([]);
	const [loaded, setLoaded] = useState(false);
	const [refreshToken, setRefreshToken] = useState(0);
	const [editorMovement, setEditorMovement] = useState<CatalogMovement | null>(null);
	const [editorVisible, setEditorVisible] = useState(false);

	useEffect(() => {
		let cancelled = false;
		listMuscleGroups(getDb())
			.then((gs) => {
				if (!cancelled) setGroups(gs.map((g) => ({ id: g.id, name: g.name as MuscleGroupName })));
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
	}, [filter, query, showArchived, refreshToken]);

	const empty = loaded && rows.length === 0;

	return (
		<SafeAreaView
			className="flex-1 web:max-w-[800px] web:mx-auto"
			edges={['top', 'left', 'right', 'bottom']}
		>
			<FlatList
				contentContainerClassName="gap-4 px-4 pb-28 pt-4"
				data={rows}
				keyExtractor={(r) => String(r.id)}
				keyboardShouldPersistTaps="handled"
				ListHeaderComponent={
					<Box className="gap-4">
						<Box className="flex-row items-center justify-between">
							<Text size="5xl" bold>
								Catalog
							</Text>
							<Button
								variant="outline"
								size="icon"
								onPress={() => {
									setEditorMovement(null);
									setEditorVisible(true);
								}}
								accessibilityLabel="Add movement"
							>
								<ButtonText>+</ButtonText>
							</Button>
						</Box>

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
							{([ALL, ...groups.map((group) => group.name)] as Filter[]).map((group) => {
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
						<Box className="items-center rounded-xl bg-card px-4 py-8">
							<Text className="text-muted-foreground">No movements match</Text>
						</Box>
					) : null
				}
				renderItem={({ item }) => (
					<MovementRow
						movement={item}
						muted={item.archived}
						onPress={() => {
							setEditorMovement(item);
							setEditorVisible(true);
						}}
					/>
				)}
			/>
			<MovementEditorModal
				key={`${editorVisible}-${editorMovement?.id ?? 'new'}`}
				visible={editorVisible}
				movement={editorMovement}
				muscleGroups={groups}
				onClose={() => setEditorVisible(false)}
				onSaved={() => {
					setEditorVisible(false);
					setRefreshToken((value) => value + 1);
				}}
				onDuplicate={(duplicate) => {
					setEditorVisible(false);
					setEditorMovement(null);
					setFilter(ALL);
					setShowArchived((current) => current || duplicate.archived === 1);
					setQuery(duplicate.name);
				}}
			/>
		</SafeAreaView>
	);
}

function MovementRow({
	movement,
	muted,
	onPress,
}: {
	movement: CatalogMovement;
	muted: boolean;
	onPress: () => void;
}) {
	return (
		<Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Edit ${movement.name}`}>
			<Box className={`flex-row items-center gap-2 rounded-xl bg-card px-4 py-4 ${muted ? 'opacity-50' : ''}`}>
				<Text>{movement.name}</Text>
				<Text size="sm" className="text-muted-foreground">
					{movement.muscleGroup}
				</Text>
				{muted && (
					<Text size="xs" bold className="ml-auto text-muted-foreground uppercase">
						Archived
					</Text>
				)}
			</Box>
		</Pressable>
	);
}
