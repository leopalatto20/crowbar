import { useEffect, useState } from 'react';
import { FlatList, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import {
	archiveMovement,
	deleteMovement,
	getDb,
	getDefaultUnit,
	getMovementDeleteReferences,
	hasMovementReferences,
	listMovements,
	listMuscleGroups,
	type CatalogMovement,
	type MovementDeleteReferences,
	unarchiveMovement,
} from '@/db';
import { DEFAULT_UNIT, type MuscleGroupName, type Unit } from '@/db/constants';
import { MovementEditorModal } from './movement-editor-modal';
import { DeleteConfirmationModal } from './components/delete-confirmation-modal';
import { MovementRow } from './components/movement-row';
import { ReferencesModal } from './components/references-modal';

const ALL = 'All' as const;
type Filter = typeof ALL | MuscleGroupName;

/**
 * Catalog browse (issue #7): a flat A–Z screen of movements. Each row shows the
 * movement name and its muscle-group chip; a row of filter chips (All + the 14
 * muscle groups) narrows the list; a name search combines with the active
 * filter; a "show archived" toggle (default off) gates archived rows entirely —
 * they only appear, muted with an "Archived" tag, when revealed. An empty state
 * appears when nothing matches. Volume-landmark numbers never appear here: this
 * is the identity list, not the measurement one. Quick-create remains a shared
 * capability for future recording and routine-building entry points, not a
 * catalog surface.
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
	const [expandedRow, setExpandedRow] = useState<number | null>(null);
	const [deleteBlockedRows, setDeleteBlockedRows] = useState<Record<number, boolean>>({});
	const [referencePanel, setReferencePanel] = useState<{
		movementName: string;
		references: MovementDeleteReferences;
	} | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [deleteConfirmation, setDeleteConfirmation] = useState<CatalogMovement | null>(null);
	const [defaultUnit, setDefaultUnit] = useState<Unit | undefined>();
	const [defaultUnitLoaded, setDefaultUnitLoaded] = useState(false);

	useEffect(() => {
		let cancelled = false;
		getDefaultUnit(getDb())
			.then((unit) => {
				if (!cancelled) setDefaultUnit(unit);
			})
			.catch((e) => console.error('Unable to load default unit', e))
			.finally(() => {
				if (!cancelled) setDefaultUnitLoaded(true);
			});
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

	const refresh = () => setRefreshToken((value) => value + 1);
	const openCreate = () => {
		if (!defaultUnitLoaded) return;
		setEditorMovement(null);
		setEditorVisible(true);
	};

	const toggleActions = async (movement: CatalogMovement) => {
		if (expandedRow === movement.id) {
			setExpandedRow(null);
			return;
		}
		try {
			const references = await getMovementDeleteReferences(getDb(), movement.id);
			setDeleteBlockedRows((current) => ({ ...current, [movement.id]: hasMovementReferences(references) }));
			setExpandedRow(movement.id);
		} catch (mutationError) {
			setError(errorMessage(mutationError, 'Unable to check movement references.'));
		}
	};

	const updateArchive = async (movement: CatalogMovement) => {
		try {
			if (movement.archived) await unarchiveMovement(getDb(), movement.id);
			else await archiveMovement(getDb(), movement.id);
			setExpandedRow(null);
			setError(null);
			refresh();
		} catch (mutationError) {
			setError(errorMessage(mutationError, 'Unable to update movement.'));
		}
	};

	const showReferences = async (movement: CatalogMovement) => {
		try {
			const references = await getMovementDeleteReferences(getDb(), movement.id);
			setExpandedRow(null);
			setReferencePanel({ movementName: movement.name, references });
		} catch (mutationError) {
			setError(errorMessage(mutationError, 'Unable to check movement references.'));
		}
	};

	const deleteAfterConfirmation = async (movement: CatalogMovement) => {
		try {
			const result = await deleteMovement(getDb(), movement.id);
			setExpandedRow(null);
			if (result.deleted) {
				setError(null);
				refresh();
			} else {
				setReferencePanel({ movementName: movement.name, references: result.references });
			}
		} catch (mutationError) {
			setError(errorMessage(mutationError, 'Unable to delete movement.'));
		}
	};

	const confirmDelete = async (movement: CatalogMovement) => {
		try {
			const references = await getMovementDeleteReferences(getDb(), movement.id);
			if (hasMovementReferences(references)) {
				setExpandedRow(null);
				setReferencePanel({ movementName: movement.name, references });
				return;
			}
		} catch (mutationError) {
			setError(errorMessage(mutationError, 'Unable to check movement references.'));
			return;
		}

		setDeleteConfirmation(movement);
	};

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
								onPress={openCreate}
								disabled={!defaultUnitLoaded}
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
						{error && (
							<Box className="rounded-xl bg-muted px-4 py-4">
								<Text className="text-destructive">{error}</Text>
							</Box>
						)}
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
						expanded={expandedRow === item.id}
						deleteBlocked={deleteBlockedRows[item.id] ?? false}
						onOpen={() => {
							setEditorMovement(item);
							setEditorVisible(true);
						}}
						onMore={() => void toggleActions(item)}
						onArchive={() => void updateArchive(item)}
						onDelete={() => void confirmDelete(item)}
						onShowReferences={() => void showReferences(item)}
					/>
				)}
			/>
			<MovementEditorModal
				key={`${editorVisible}-${editorMovement?.id ?? 'new'}`}
				visible={editorVisible}
				movement={editorMovement}
				muscleGroups={groups}
				defaultUnit={defaultUnit ?? DEFAULT_UNIT}
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
			<ReferencesModal panel={referencePanel} onClose={() => setReferencePanel(null)} />
			<DeleteConfirmationModal
				movement={deleteConfirmation}
				onCancel={() => setDeleteConfirmation(null)}
				onConfirm={() => {
					if (!deleteConfirmation) return;
					const movement = deleteConfirmation;
					setDeleteConfirmation(null);
					void deleteAfterConfirmation(movement);
				}}
			/>
		</SafeAreaView>
	);
}

function errorMessage(error: unknown, fallback: string): string {
	return error instanceof Error ? error.message : fallback;
}
