import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ActivityIndicator, FlatList, PanResponder, ScrollView, type LayoutChangeEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import {
	createRoutine,
	getDefaultUnit,
	getRecordingScale,
	getRoutine,
	getDb,
	listMovements,
	listMuscleGroups,
	listRoutines,
	updateRoutine,
	type CatalogMovement,
	type Movement,
	type RoutineSummary,
	type RoutineWithEntries,
} from "@/db";
import { DEFAULT_UNIT, type RecordingScale, type Unit } from "@/db/constants";

import {
	addRoutineEntry as addDraftEntry,
	createRoutineDraft as createDraft,
	createRoutineEntryDraft as createDraftEntry,
	removeRoutineEntry as removeDraftEntry,
	reorderRoutineEntry as reorderDraftEntry,
	routineDraftToInput as draftToInput,
	undoRoutineEntryRemoval as undoDraftRemoval,
	updateRoutineEntryTarget as updateDraftTarget,
	validateRoutineDraft as validateDraft,
	validateRoutineEntry as validateEntry,
	type RoutineDraft,
	type RoutineEntryDraft,
	type RoutineEntryTargetField,
} from "./routine-builder-state";
import { MovementEditorModal, type MuscleGroupOption } from "@/features/catalog/movement-editor-modal";
import {
	createQuickCreateState,
	quickCreateReducer,
} from "@/features/catalog/quick-create-state";
import { MovementPickerModal } from "./movement-picker-modal";
import { canSelectMovement } from "./movement-picker-state";

type View = "list" | "builder";

export default function RoutinesScreen() {
	const [view, setView] = useState<View>("list");
	const [rows, setRows] = useState<RoutineSummary[]>([]);
	const [loaded, setLoaded] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [refreshToken, setRefreshToken] = useState(0);
	const [movementOptions, setMovementOptions] = useState<CatalogMovement[]>([]);
	const [movementsLoading, setMovementsLoading] = useState(false);
	const [movementsError, setMovementsError] = useState<string | null>(null);
	const [recordingScale, setRecordingScale] = useState<RecordingScale>("rpe");
	const [muscleGroups, setMuscleGroups] = useState<MuscleGroupOption[]>([]);
	const [defaultUnit, setDefaultUnit] = useState<Unit>(DEFAULT_UNIT);
	const [editingRoutine, setEditingRoutine] = useState<RoutineWithEntries | null>(null);
	const [editingRoutineId, setEditingRoutineId] = useState<number | null>(null);
	const refreshMovementOptions = useCallback(async (includeArchived: boolean) => {
		const movements = await listMovements(getDb(), { includeArchived });
		setMovementOptions(movements);
		return movements;
	}, []);

	useEffect(() => {
		let cancelled = false;
		Promise.resolve()
			.then(() => {
				if (cancelled) return undefined;
				setLoading(true);
				setError(null);
				return listRoutines(getDb());
			})
			.then((routines) => {
				if (!cancelled && routines) {
					setRows(routines);
					setLoaded(true);
				}
			})
			.catch((loadError) => {
				if (!cancelled) setError(errorMessage(loadError, "Unable to load Routines."));
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [refreshToken]);

	useEffect(() => {
		getRecordingScale(getDb()).then(setRecordingScale).catch(() => undefined);
		Promise.all([listMuscleGroups(getDb()), getDefaultUnit(getDb())])
			.then(([groups, unit]) => {
				setMuscleGroups(groups.map((group) => ({ id: group.id, name: group.name })));
				setDefaultUnit(unit);
			})
			.catch(() => undefined);
	}, []);

	useEffect(() => {
		if (view !== "builder") return;
		let cancelled = false;
		Promise.resolve()
			.then(() => {
				if (cancelled) return undefined;
				setMovementsLoading(true);
				setMovementsError(null);
				return refreshMovementOptions(editingRoutine !== null);
			})
			.catch((loadError) => {
				if (!cancelled) setMovementsError(errorMessage(loadError, "Unable to load active Movements."));
			})
			.finally(() => {
				if (!cancelled) setMovementsLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [editingRoutine, refreshMovementOptions, view]);

	const openCreate = () => {
		setError(null);
		setEditingRoutine(null);
		setView("builder");
	};

	const openEdit = async (routineId: number) => {
		setError(null);
		setEditingRoutineId(routineId);
		try {
			const routine = await getRoutine(getDb(), routineId);
			if (!routine) throw new Error("Routine no longer exists.");
			setEditingRoutine(routine);
			setView("builder");
		} catch (loadError) {
			setError(errorMessage(loadError, "Unable to open Routine."));
		} finally {
			setEditingRoutineId(null);
		}
	};

	const closeBuilder = () => {
		setView("list");
		setEditingRoutine(null);
		setMovementOptions([]);
	};

	if (view === "builder") {
		return (
			<RoutineBuilder
				key={`${editingRoutine?.routine.id ?? "new"}-${recordingScale}`}
				routine={editingRoutine}
				recordingScale={recordingScale}
				movementOptions={movementOptions}
				movementsLoading={movementsLoading}
				movementsError={movementsError}
				muscleGroups={muscleGroups}
				defaultUnit={defaultUnit}
				onRefreshMovements={() => refreshMovementOptions(editingRoutine !== null)}
				onCancel={closeBuilder}
				onSaved={() => {
					closeBuilder();
					setRefreshToken((token) => token + 1);
				}}
			/>
		);
	}

	const empty = loaded && rows.length === 0;
	return (
		<SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right", "bottom"]}>
			<FlatList
				className="w-full web:mx-auto web:max-w-[800px]"
				contentContainerClassName="gap-4 px-4 pb-28 pt-4"
				data={rows}
				keyExtractor={(routine) => String(routine.id)}
				ListHeaderComponent={
					<Box className="gap-4">
						<Box className="flex-row items-center justify-between">
							<Text size="5xl" bold>Routines</Text>
							{!empty && (
								<Button onPress={openCreate} accessibilityLabel="Create routine">
									<ButtonText>Create routine</ButtonText>
								</Button>
							)}
						</Box>
						{error && (
							<Box className="gap-2 rounded-xl bg-muted px-4 py-4" accessibilityRole="alert">
								<Text className="text-destructive">{error}</Text>
								<Button variant="outline" onPress={() => setRefreshToken((token) => token + 1)}>
									<ButtonText>Try again</ButtonText>
								</Button>
							</Box>
						)}
					</Box>
				}
				ListEmptyComponent={
					loading || editingRoutineId !== null ? (
						<Box className="items-center gap-2 rounded-xl bg-card px-4 py-8">
							<ActivityIndicator accessibilityLabel="Loading routines" />
							<Text className="text-muted-foreground">Loading Routines…</Text>
						</Box>
					) : empty && !error ? (
						<Box className="items-center gap-4 rounded-xl bg-card px-4 py-8">
							<Box className="items-center gap-2">
								<Text size="xl" bold>No Routines yet</Text>
								<Text className="text-center text-muted-foreground">Build a simple ledger for your next session.</Text>
							</Box>
							<Button onPress={openCreate} accessibilityLabel="Create routine">
								<ButtonText>Create routine</ButtonText>
							</Button>
						</Box>
					) : null
				}
				renderItem={({ item }) => (
					<Button
						variant="ghost"
						onPress={() => void openEdit(item.id)}
						className="w-full flex-row items-center justify-between rounded-xl bg-card px-4 py-4"
						accessibilityLabel={`Edit ${item.name}`}
					>
						<ButtonText className="min-w-0 flex-1 justify-start text-left" numberOfLines={1}>{item.name}</ButtonText>
						<Text size="sm" className="text-muted-foreground">{movementCountLabel(item.movementCount)}</Text>
					</Button>
				)}
			/>
		</SafeAreaView>
	);
}

type RoutineBuilderProps = {
	routine: RoutineWithEntries | null;
	recordingScale: RecordingScale;
	movementOptions: CatalogMovement[];
	movementsLoading: boolean;
	movementsError: string | null;
	muscleGroups: MuscleGroupOption[];
	defaultUnit: Unit;
	onRefreshMovements: () => Promise<CatalogMovement[]>;
	onCancel: () => void;
	onSaved: () => void;
};

function RoutineBuilder({
	routine,
	recordingScale,
	movementOptions,
	movementsLoading,
	movementsError,
	muscleGroups,
	defaultUnit,
	onRefreshMovements,
	onCancel,
	onSaved,
}: RoutineBuilderProps) {
	const [draft, setDraft] = useState<RoutineDraft>(() => createDraft(routine?.routine.name ?? "", recordingScale, routine?.entries ?? []));
	const [pendingEntry, setPendingEntry] = useState<RoutineEntryDraft | null>(null);
	const [pickerVisible, setPickerVisible] = useState(false);
	const [createdMovementId, setCreatedMovementId] = useState<number | null>(null);
	const [quickCreateVisible, setQuickCreateVisible] = useState(false);
	const [quickCreateSession, setQuickCreateSession] = useState(0);
	const [quickCreate, dispatchQuickCreate] = useReducer(quickCreateReducer, createQuickCreateState());
	const ledgerScrollRef = useRef<ScrollView>(null);
	const ledgerOffsetRef = useRef(0);
	const ledgerLayoutsRef = useRef<Record<number, number>>({});
	const pendingRevealRef = useRef<number | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const validation = validateDraft(draft);
	const selectedIds = useMemo(() => draft.entries.map((entry) => entry.movementId), [draft.entries]);
	const selectedMovements = draft.entries
		.map((entry) => movementOptions.find((movement) => movement.id === entry.movementId))
		.filter((movement): movement is CatalogMovement => movement !== undefined);
	const pendingMovement = pendingEntry && movementOptions.find((movement) => movement.id === pendingEntry.movementId);
	const pendingErrors = pendingEntry ? validateEntry(pendingEntry, recordingScale) : [];

	const updateDraft = (next: RoutineDraft) => {
		setDraft(next);
		setError(null);
	};
	const updatePending = (field: RoutineEntryTargetField, value: string) => {
		setPendingEntry((entry) => entry ? { ...entry, [field]: value } : entry);
	};
	const addPending = () => {
		if (!pendingEntry || pendingErrors.length > 0) return;
		const added = addDraftEntry(draft, pendingEntry.movementId);
		updateDraft({
			...added,
			entries: added.entries.map((entry) => entry.movementId === pendingEntry.movementId ? pendingEntry : entry),
		});
		setPendingEntry(null);
	};
	const beginMovementSetup = (movementId: number) => {
		setPendingEntry(createDraftEntry(movementId));
		setPickerVisible(false);
	};
	const chooseMovement = (movement: CatalogMovement) => {
		if (!canSelectMovement(movement, selectedIds)) return;
		setCreatedMovementId(null);
		beginMovementSetup(movement.id);
	};
	const startQuickCreate = (name: string) => {
		setCreatedMovementId(null);
		dispatchQuickCreate({ type: "quickCreateStarted", name });
		setQuickCreateSession((session) => session + 1);
		setQuickCreateVisible(true);
	};
	const closeQuickCreate = () => {
		dispatchQuickCreate({ type: "modalCancelled" });
		setQuickCreateVisible(false);
	};
	const handleQuickCreateMovement = async (movement: Movement, action: "movementSaved" | "movementSelected") => {
		if (action === "movementSelected") dispatchQuickCreate({ type: "duplicateNavigated" });
		setError(null);
		try {
			const refreshedMovements = await onRefreshMovements();
			const catalogMovement = refreshedMovements.find((candidate) => candidate.id === movement.id);
			if (!catalogMovement) throw new Error("The new Movement could not be loaded into the picker.");
			dispatchQuickCreate({ type: action, movement: { id: movement.id, name: movement.name } });
			setQuickCreateVisible(false);
			if (selectedIds.includes(catalogMovement.id)) {
				setPickerVisible(false);
				onRevealExisting(catalogMovement.id);
				return;
			}
			if (!canSelectMovement(catalogMovement, selectedIds)) {
				throw new Error("Archived Movements cannot be added to a new Routine.");
			}
			beginMovementSetup(catalogMovement.id);
			if (action === "movementSaved") {
				setCreatedMovementId(catalogMovement.id);
				setPickerVisible(true);
			}
		} catch (loadError) {
			setError(errorMessage(loadError, "Unable to return to the Movement picker."));
		}
	};
	const onQuickCreateSaved = (movement: Movement) => handleQuickCreateMovement(movement, "movementSaved");
	const onQuickCreateDuplicate = (movement: Movement) => handleQuickCreateMovement(movement, "movementSelected");
	const scrollToLedgerEntry = (movementId: number): boolean => {
		const y = ledgerLayoutsRef.current[movementId];
		if (y === undefined) return false;
		ledgerScrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
		return true;
	};
	const onRevealExisting = (movementId: number) => {
		setPickerVisible(false);
		pendingRevealRef.current = movementId;
		requestAnimationFrame(() => {
			if (scrollToLedgerEntry(movementId)) {
				pendingRevealRef.current = null;
				return;
			}
			if (pendingRevealRef.current === movementId) {
				pendingRevealRef.current = null;
				ledgerScrollRef.current?.scrollToEnd({ animated: true });
			}
		});
	};
	const save = async () => {
		if (!validation.valid || saving) return;
		setSaving(true);
		setError(null);
		try {
			const input = draftToInput(draft);
			if (routine) await updateRoutine(getDb(), routine.routine.id, input);
			else await createRoutine(getDb(), input);
			onSaved();
		} catch (saveError) {
			setError(errorMessage(saveError, "Unable to save Routine."));
		} finally {
			setSaving(false);
		}
	};

	return (
		<SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right", "bottom"]}>
			<ScrollView ref={ledgerScrollRef} contentContainerClassName="mx-auto w-full max-w-[800px] gap-4 px-4 pb-28 pt-4" keyboardShouldPersistTaps="handled">
				<Box className="flex-row items-center justify-between">
					<Button variant="ghost" onPress={onCancel} accessibilityLabel="Back to routines"><ButtonText>Back</ButtonText></Button>
					<Text size="2xl" bold>{routine ? "Edit Routine" : "New Routine"}</Text>
					<Box className="w-16" />
				</Box>

				<Box className="gap-2">
					<Text size="sm" bold>Routine name</Text>
					<Input isInvalid={Boolean(validation.nameError)}>
						<InputField
							value={draft.name}
							onChangeText={(name) => updateDraft({ ...draft, name })}
							placeholder="e.g. Upper body"
							accessibilityLabel="Routine name"
							autoCapitalize="sentences"
						/>
					</Input>
					{validation.nameError && <Text size="sm" className="text-destructive">{validation.nameError}</Text>}
				</Box>

				<Box
					className="gap-4 rounded-xl bg-card p-4"
					onLayout={(event) => { ledgerOffsetRef.current = event.nativeEvent.layout.y; }}
				>
					<Box className="flex-row items-center justify-between">
						<Text size="lg" bold>Ledger</Text>
						<Text size="sm" className="text-muted-foreground">{movementCountLabel(draft.entries.length)}</Text>
					</Box>
					{selectedMovements.length === 0 ? (
						<Text className="py-4 text-muted-foreground">No Movements added yet.</Text>
					) : selectedMovements.map((movement, index) => (
						<RoutineEntryRow
							key={movement.id}
							index={index}
							entryCount={draft.entries.length}
							movement={movement}
							entry={draft.entries.find((entry) => entry.movementId === movement.id)!}
							recordingScale={recordingScale}
							errors={validation.entryErrors[movement.id] ?? []}
							onTargetChange={(field, value) => updateDraft(updateDraftTarget(draft, movement.id, field, value))}
							onClearRepRange={() => updateDraft({ ...draft, entries: draft.entries.map((entry) => entry.movementId === movement.id ? { ...entry, repMin: "", repMax: "" } : entry) })}
							onMove={(from, to) => updateDraft(reorderDraftEntry(draft, from, to))}
							onMoveUp={() => updateDraft(moveDraftEntry(draft, movement.id, "up"))}
							onMoveDown={() => updateDraft(moveDraftEntry(draft, movement.id, "down"))}
							onRemove={() => updateDraft(removeDraftEntry(draft, movement.id))}
							onLayout={(event) => {
								ledgerLayoutsRef.current[movement.id] = ledgerOffsetRef.current + event.nativeEvent.layout.y;
								if (pendingRevealRef.current === movement.id) {
									pendingRevealRef.current = null;
									requestAnimationFrame(() => { scrollToLedgerEntry(movement.id); });
								}
							}}
						/>
					))}
				</Box>

				{pendingEntry && pendingMovement && (
					<Box className="gap-4 rounded-xl bg-card p-4">
						<Box className="flex-row items-center justify-between">
							<Box className="min-w-0 flex-1 gap-1">
								<Text size="lg" bold>Configure Movement</Text>
								<Text className="text-muted-foreground">{pendingMovement.name}</Text>
							</Box>
							<Button variant="ghost" onPress={() => setPendingEntry(null)} accessibilityLabel="Cancel movement setup"><ButtonText>Cancel</ButtonText></Button>
						</Box>
						<RoutineTargetFields entry={pendingEntry} recordingScale={recordingScale} errors={pendingErrors} onChange={updatePending} onClearRepRange={() => setPendingEntry((entry) => entry ? { ...entry, repMin: "", repMax: "" } : entry)} />
						<Button variant="outline" onPress={addPending} disabled={pendingErrors.length > 0} accessibilityLabel={`Add ${pendingMovement.name} to routine`}>
							<ButtonText>Add to ledger</ButtonText>
						</Button>
					</Box>
				)}

				<Button
					variant="outline"
					onPress={() => setPickerVisible(true)}
					disabled={movementsLoading || Boolean(movementsError)}
					accessibilityLabel="Add movement to routine"
				>
					<ButtonText>{movementsLoading ? "Loading movements…" : "Add movement"}</ButtonText>
				</Button>
				{movementsError && <Text className="text-destructive">{movementsError}</Text>}
				{draft.lastRemoved && (
					<Box className="flex-row items-center gap-2 rounded-xl bg-muted px-4 py-4" accessibilityLiveRegion="polite">
						<Text className="min-w-0 flex-1">{movementName(draft.lastRemoved.entry.movementId, movementOptions)} removed.</Text>
						<Button variant="link" size="sm" className="px-0" onPress={() => updateDraft(undoDraftRemoval(draft))} accessibilityLabel="Undo removed movement"><ButtonText>Undo</ButtonText></Button>
					</Box>
				)}
				{error && <Box className="rounded-xl bg-muted px-4 py-2" accessibilityRole="alert"><Text className="text-destructive">{error}</Text></Box>}
				<Button onPress={() => void save()} disabled={!validation.valid || saving} accessibilityLabel="Save routine">
					<ButtonText>{saving ? "Saving…" : routine ? "Save changes" : "Save routine"}</ButtonText>
				</Button>
			</ScrollView>
			<MovementPickerModal
				visible={pickerVisible}
				options={movementOptions}
				selectedIds={selectedIds}
				createdMovement={createdMovementId === null ? null : movementOptions.find((movement) => movement.id === createdMovementId)}
				onClose={() => setPickerVisible(false)}
				onCreate={startQuickCreate}
				onContinueWithCreated={() => {
					setCreatedMovementId(null);
					setPickerVisible(false);
				}}
				onSelect={chooseMovement}
				onRevealExisting={onRevealExisting}
			/>
			{quickCreateVisible && (
				<MovementEditorModal
					key={`quick-create-${quickCreateSession}`}
					visible
					muscleGroups={muscleGroups}
					defaultUnit={defaultUnit}
					initialName={quickCreate.workingName}
					draft={quickCreate.draft}
					onClose={closeQuickCreate}
					onSaved={(movement) => { void onQuickCreateSaved(movement); }}
					onDuplicate={(movement) => { void onQuickCreateDuplicate(movement); }}
					onDraftChange={(draft) => dispatchQuickCreate({ type: "draftChanged", draft })}
				/>
			)}
		</SafeAreaView>
	);
}

type RoutineEntryRowProps = {
	index: number;
	entryCount: number;
	movement: CatalogMovement;
	entry: RoutineEntryDraft;
	recordingScale: RecordingScale;
	errors: string[];
	onTargetChange: (field: RoutineEntryTargetField, value: string) => void;
	onClearRepRange: () => void;
	onMove: (from: number, to: number) => void;
	onMoveUp: () => void;
	onMoveDown: () => void;
	onRemove: () => void;
	onLayout: (event: LayoutChangeEvent) => void;
};

function RoutineEntryRow({ index, entryCount, movement, entry, recordingScale, errors, onTargetChange, onClearRepRange, onMove, onMoveUp, onMoveDown, onRemove, onLayout }: RoutineEntryRowProps) {
	return (
		<Box onLayout={onLayout} className={movement.archived ? "gap-2 border-t border-border py-4 opacity-50" : "gap-2 border-t border-border py-4"}>
			<Box className="flex-row items-start gap-2">
				<DragHandle index={index} label={movement.name} onMove={onMove} />
				<Box className="min-w-0 flex-1 gap-1">
					<Text size="sm" className="text-muted-foreground">{index + 1}</Text>
					<Text bold>{movement.name}</Text>
					{movement.archived && <Text size="sm" bold className="uppercase text-muted-foreground">Archived</Text>}
				</Box>
				<Box className="flex-row gap-1">
					<Button variant="ghost" size="sm" onPress={onMoveUp} disabled={index === 0} accessibilityLabel={`Move ${movement.name} up`}><ButtonText>↑</ButtonText></Button>
					<Button variant="ghost" size="sm" onPress={onMoveDown} disabled={index === entryCount - 1} accessibilityLabel={`Move ${movement.name} down`}><ButtonText>↓</ButtonText></Button>
				</Box>
			</Box>
			<RoutineTargetFields
				entry={entry}
				recordingScale={recordingScale}
				errors={errors}
				onChange={onTargetChange}
				onClearRepRange={onClearRepRange}
			/>
			<Button variant="link" size="sm" className="self-start px-0" onPress={onRemove} accessibilityLabel={`Remove ${movement.name}`}><ButtonText>Remove</ButtonText></Button>
		</Box>
	);
}

function DragHandle({ index, label, onMove }: { index: number; label: string; onMove: (from: number, to: number) => void }) {
	const responder = useMemo(() => PanResponder.create({
		onStartShouldSetPanResponder: () => true,
		onMoveShouldSetPanResponder: () => true,
		onPanResponderRelease: (_, gesture) => {
			const offset = gesture.dy > 96 ? 1 : gesture.dy < -96 ? -1 : 0;
			if (offset) onMove(index, index + offset);
		},
	}), [index, onMove]);
	return (
		<Button {...responder.panHandlers} variant="ghost" size="icon" accessibilityLabel={`Drag ${label}`} className="bg-muted">
			<ButtonText className="text-muted-foreground">≡</ButtonText>
		</Button>
	);
}

function RoutineTargetFields({ entry, recordingScale, errors, onChange, onClearRepRange }: { entry: RoutineEntryDraft; recordingScale: RecordingScale; errors: string[]; onChange: (field: RoutineEntryTargetField, value: string) => void; onClearRepRange: () => void }) {
	return (
		<Box className="gap-2">
			<TargetField label="Working sets" value={entry.workingSetCount} error={errors.find((error) => error.startsWith("Working-set"))} onChange={(value) => onChange("workingSetCount", value)} onClear={() => onChange("workingSetCount", "")} keyboardType="number-pad" />
			<Box className="gap-2">
				<Text size="sm" bold>Rep range</Text>
				<Box className="flex-row gap-2">
					<Box className="min-w-0 flex-1"><Input isInvalid={Boolean(errors.some((error) => error.includes("Rep")))}><InputField value={entry.repMin} onChangeText={(value) => onChange("repMin", value)} placeholder="Min" accessibilityLabel="Minimum reps" keyboardType="number-pad" /></Input></Box>
					<Box className="min-w-0 flex-1"><Input isInvalid={Boolean(errors.some((error) => error.includes("Rep")))}><InputField value={entry.repMax} onChangeText={(value) => onChange("repMax", value)} placeholder="Max" accessibilityLabel="Maximum reps" keyboardType="number-pad" /></Input></Box>
					<Button variant="link" size="sm" className="px-0" onPress={onClearRepRange} accessibilityLabel="Clear rep range"><ButtonText>Clear</ButtonText></Button>
				</Box>
				{errors.filter((error) => error.includes("Rep")).map((error) => <Text key={error} size="sm" className="text-destructive">{error}</Text>)}
			</Box>
			<TargetField label={`${recordingScale.toUpperCase()} target`} value={entry.proximityValue} error={errors.find((error) => error.includes("target must"))} onChange={(value) => onChange("proximityValue", value)} onClear={() => onChange("proximityValue", "")} keyboardType="decimal-pad" />
			<TargetField label="Tempo" value={entry.tempo} error={errors.find((error) => error.startsWith("Tempo"))} onChange={(value) => onChange("tempo", value)} onClear={() => onChange("tempo", "")} placeholder="3-1-1-0" />
		</Box>
	);
}

type TargetFieldProps = { label: string; value: string; error?: string; onChange: (value: string) => void; onClear: () => void; placeholder?: string; keyboardType?: "number-pad" | "decimal-pad" };
function TargetField({ label, value, error, onChange, onClear, placeholder, keyboardType }: TargetFieldProps) {
	return (
		<Box className="gap-2">
			<Box className="flex-row items-center justify-between">
				<Text size="sm" bold>{label}</Text>
				{value !== "" && <Button variant="link" size="sm" className="px-0" onPress={onClear} accessibilityLabel={`Clear ${label}`}><ButtonText>Clear</ButtonText></Button>}
			</Box>
			<Input isInvalid={Boolean(error)}><InputField value={value} onChangeText={onChange} placeholder={placeholder} accessibilityLabel={label} keyboardType={keyboardType} /></Input>
			{error && <Text size="sm" className="text-destructive">{error}</Text>}
		</Box>
	);
}

function movementName(id: number, options: CatalogMovement[]): string {
	return options.find((movement) => movement.id === id)?.name ?? "Movement";
}

function errorMessage(error: unknown, fallback: string): string {
	return error instanceof Error ? error.message : fallback;
}

function movementCountLabel(count: number): string {
	return `${count} ${count === 1 ? "Movement" : "Movements"}`;
}

function moveDraftEntry(draft: RoutineDraft, movementId: number, direction: "up" | "down"): RoutineDraft {
	const index = draft.entries.findIndex((entry) => entry.movementId === movementId);
	return reorderDraftEntry(draft, index, direction === "up" ? index - 1 : index + 1);
}
