import { useEffect, useReducer, useState } from 'react';
import { FlatList, Modal, ScrollView } from 'react-native';
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
	type Reference,
	unarchiveMovement,
} from '@/db';
import { MovementEditorModal } from '@/components/movement-editor-modal';
import {
	createQuickCreateState,
	quickCreateReducer,
	type MovementEditorDraft,
} from '@/components/quick-create-state';
import { DEFAULT_UNIT, type MuscleGroupName, type Unit } from '@/db/constants';

const ALL = 'All' as const;
type Filter = typeof ALL | MuscleGroupName;
type EditorSource = 'catalog' | 'quick';

/**
 * Catalog browse (issue #7): a flat A–Z screen of movements. Each row shows the
 * movement name and its muscle-group chip; a row of filter chips (All + the 14
 * muscle groups) narrows the list; a name search combines with the active
 * filter; a "show archived" toggle (default off) gates archived rows entirely —
 * they only appear, muted with an "Archived" tag, when revealed. An empty state
 * appears when nothing matches. Volume-landmark numbers never appear here: this
 * is the identity list, not the measurement one. The Quick create card below is
 * the stand-in for future recording and routine-building anchors; those native
 * entry points are intentionally out of scope for this ticket.
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
	const [quickCreate, dispatchQuickCreate] = useReducer(quickCreateReducer, undefined, createQuickCreateState);
	const { workingName: quickName, draft: quickDraft, currentMovementId } = quickCreate;
	const [editorSource, setEditorSource] = useState<EditorSource>('catalog');

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
	const updateQuickName = (name: string) => {
		dispatchQuickCreate({ type: 'workingNameChanged', name });
	};
	const openCreate = (source: EditorSource) => {
		if (!defaultUnitLoaded) return;
		setEditorSource(source);
		setEditorMovement(null);
		setEditorVisible(true);
	};
	const retainDraft = (draft: MovementEditorDraft) => {
		dispatchQuickCreate({ type: 'draftChanged', draft });
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
								onPress={() => openCreate('catalog')}
								disabled={!defaultUnitLoaded}
								accessibilityLabel="Add movement"
							>
								<ButtonText>+</ButtonText>
							</Button>
						</Box>

						<Box className="gap-2 rounded-xl bg-card px-4 py-4">
							<Text size="2xl" className="font-semibold">Quick create</Text>
							<Text>Start a movement without changing catalog search.</Text>
							<Input>
								<InputField
									value={quickName}
									onChangeText={updateQuickName}
									placeholder="Movement name"
									accessibilityLabel="Quick create movement name"
									autoCorrect={false}
									autoCapitalize="words"
								/>
							</Input>
							<Button variant="outline" onPress={() => openCreate('quick')} disabled={!defaultUnitLoaded}>
								<ButtonText>{defaultUnitLoaded ? 'Open movement editor' : 'Loading defaults…'}</ButtonText>
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
						current={currentMovementId === item.id}
						expanded={expandedRow === item.id}
						deleteBlocked={deleteBlockedRows[item.id] ?? false}
						onOpen={() => {
							setEditorSource('catalog');
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
				key={`${editorVisible}-${editorMovement?.id ?? editorSource}`}
				visible={editorVisible}
				movement={editorMovement}
				muscleGroups={groups}
				defaultUnit={defaultUnit ?? DEFAULT_UNIT}
				draft={editorSource === 'quick' && !editorMovement ? quickDraft : undefined}
				initialName={editorSource === 'quick' && !editorMovement ? quickName : undefined}
				onDraftChange={editorSource === 'quick' && !editorMovement ? retainDraft : undefined}
				onClose={() => {
					if (editorSource === 'quick') dispatchQuickCreate({ type: 'modalCancelled' });
					setEditorVisible(false);
				}}
				onSaved={(saved) => {
					setEditorVisible(false);
					setRefreshToken((value) => value + 1);
					if (editorSource === 'quick') {
						// A completed draft becomes the current entry; the next quick-create starts
						// fresh so its required muscle group is never carried forward.
						dispatchQuickCreate({ type: 'movementSaved', movement: saved });
						setFilter(ALL);
						setShowArchived(false);
						setQuery(saved.name);
					}
				}}
				onDuplicate={(duplicate) => {
					setEditorVisible(false);
					setEditorMovement(null);
					if (editorSource === 'quick') dispatchQuickCreate({ type: 'duplicateNavigated' });
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

type MovementRowProps = {
	movement: CatalogMovement;
	current: boolean;
	expanded: boolean;
	deleteBlocked: boolean;
	onOpen: () => void;
	onMore: () => void;
	onArchive: () => void;
	onDelete: () => void;
	onShowReferences: () => void;
};

function MovementRow({
	movement,
	current,
	expanded,
	deleteBlocked,
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
					accessibilityLabel={`Edit ${movement.name}`}
				>
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
					accessibilityLabel={`${expanded ? 'Hide' : 'Show'} actions for ${movement.name}`}
				>
					<ButtonText>{expanded ? 'Close' : 'More'}</ButtonText>
				</Button>
				<Box className="items-end gap-1">
					{current && <Text size="xs" bold className="text-muted-foreground uppercase">Current entry</Text>}
					{movement.archived && (
						<Text size="xs" bold className="text-muted-foreground uppercase">Archived</Text>
					)}
				</Box>
			</Box>
			{expanded && (
				<Box className="flex-row flex-wrap items-center gap-2 px-4 pb-4">
					<Button
						variant="outline"
						onPress={onArchive}
						accessibilityLabel={movement.archived ? `Un-archive ${movement.name}` : `Archive ${movement.name}`}
					>
						<ButtonText>{movement.archived ? 'Un-archive' : 'Archive'}</ButtonText>
					</Button>
					<Button
						variant="destructive"
						disabled={deleteBlocked}
						onPress={onDelete}
						accessibilityLabel={`Delete ${movement.name}`}
					>
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

function errorMessage(error: unknown, fallback: string): string {
	return error instanceof Error ? error.message : fallback;
}

function referenceDate(timestamp: number | undefined): string {
	if (timestamp === undefined) return '';
	return new Date(timestamp).toLocaleDateString();
}

function ReferencesModal({
	panel,
	onClose,
}: {
	panel: { movementName: string; references: MovementDeleteReferences } | null;
	onClose: () => void;
}) {
	return (
		<Modal visible={panel !== null} transparent animationType="slide" onRequestClose={onClose}>
			<Box className="flex-1 justify-end bg-foreground/40">
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

function DeleteConfirmationModal({
	movement,
	onCancel,
	onConfirm,
}: {
	movement: CatalogMovement | null;
	onCancel: () => void;
	onConfirm: () => void;
}) {
	return (
		<Modal visible={movement !== null} transparent animationType="fade" onRequestClose={onCancel}>
			<Box className="flex-1 items-center justify-center bg-foreground/40 px-4">
				<Box className="w-full max-w-[480px] gap-4 rounded-xl bg-popover p-4">
					<Text size="2xl" className="font-semibold">Delete movement?</Text>
					{movement && (
						<Text className="text-muted-foreground">
							Delete {movement.name} permanently? This cannot be undone.
						</Text>
					)}
					<Box className="flex-row justify-end gap-2">
						<Button variant="outline" onPress={onCancel} accessibilityLabel="Cancel delete">
							<ButtonText>Cancel</ButtonText>
						</Button>
						<Button variant="destructive" onPress={onConfirm} accessibilityLabel="Confirm delete">
							<ButtonText>Delete</ButtonText>
						</Button>
					</Box>
				</Box>
			</Box>
		</Modal>
	);
}

function ReferenceSection({ title, references }: { title: string; references: Reference[] }) {
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
