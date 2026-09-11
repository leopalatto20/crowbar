import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import {
  AccessibilityInfo,
  ActivityIndicator,
  PanResponder,
  ScrollView,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, ChevronDown, ChevronUp, GripVertical, Pencil } from 'lucide-react-native';

import {
  ArchiveVisibilityToggle,
  EntityListScreen,
  EntityListTitle,
} from '@/components/app/entity-list-screen';
import { Box } from '@/components/ui/box';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import {
  archiveRoutine,
  createRoutine,
  deleteRoutine,
  getDefaultUnit,
  getRecordingScale,
  getRoutine,
  getRoutineDeleteReferences,
  getDb,
  hasRoutineReferences,
  listMovements,
  listMuscleGroups,
  listRoutines,
  unarchiveRoutine,
  updateRoutine,
  type CatalogMovement,
  type Movement,
  type RoutineDeleteReferences,
  type RoutineSummary,
  type RoutineWithEntries,
} from '@/db';
import { DEFAULT_UNIT, type RecordingScale, type Unit } from '@/db/constants';
import { normalizeErrorMessage } from '@/shared/error-message';

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
} from './routine-builder-state';
import {
  MovementEditorModal,
  type MuscleGroupOption,
} from '@/features/catalog/movement-editor-modal';
import { createQuickCreateState, quickCreateReducer } from '@/features/catalog/quick-create-state';
import { MovementPickerModal } from './movement-picker-modal';
import { canSelectMovement } from './movement-picker-state';
import { RoutineDeleteConfirmationModal } from './components/routine-delete-confirmation-modal';
import { RoutineReferencesModal } from './components/routine-references-modal';
import { RoutineRow } from './components/routine-row';
import { UnsavedChangesModal } from '@/features/catalog/components/unsaved-changes-modal';
import {
  isQuickCreateDraftDirty,
  isRoutineDraftDirty,
  parseRoutineBuilderRoute,
} from './routine-builder-navigation-state';

type NavigationAction = Record<string, unknown>;
type NavigationEvents = {
  addListener: (
    eventName: 'beforeRemove' | 'tabPress',
    listener: (event: {
      preventDefault: () => void;
      target?: string;
      data?: { action: NavigationAction };
    }) => void,
  ) => () => void;
  getState: () => { routes: { key: string; name: string }[] };
  dispatch: (action: NavigationAction) => void;
  navigate: (name: string) => void;
};

export default function RoutinesScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{
    builder?: string | string[];
    routineId?: string | string[];
  }>();
  const builderParam = Array.isArray(params.builder) ? params.builder[0] : params.builder;
  const routineIdParam = Array.isArray(params.routineId) ? params.routineId[0] : params.routineId;
  const builderRoute = useMemo(
    () => parseRoutineBuilderRoute({ builder: builderParam, routineId: routineIdParam }),
    [builderParam, routineIdParam],
  );
  const [routineBuilderDirty, setRoutineBuilderDirty] = useState(false);
  const [discardChangesVisible, setDiscardChangesVisible] = useState(false);
  const [pendingExit, setPendingExit] = useState<(() => void) | null>(null);
  const allowNavigationRef = useRef(false);
  const [rows, setRows] = useState<RoutineSummary[]>([]);
  const hasLoadedRef = useRef(false);
  const [showArchived, setShowArchived] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [archiveBusyId, setArchiveBusyId] = useState<number | null>(null);
  const [referencePanel, setReferencePanel] = useState<{
    routineName: string;
    references: RoutineDeleteReferences;
  } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<RoutineSummary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [movementOptions, setMovementOptions] = useState<CatalogMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsError, setMovementsError] = useState<string | null>(null);
  const [recordingScale, setRecordingScale] = useState<RecordingScale>('rpe');
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroupOption[]>([]);
  const [defaultUnit, setDefaultUnit] = useState<Unit>(DEFAULT_UNIT);
  const [editingRoutine, setEditingRoutine] = useState<RoutineWithEntries | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editRetryToken, setEditRetryToken] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const refreshMovementOptions = useCallback(async (includeArchived: boolean) => {
    const movements = await listMovements(getDb(), { includeArchived });
    setMovementOptions(movements);
    return movements;
  }, []);
  const loadMovementOptions = useCallback(
    async (includeArchived: boolean) => {
      setMovementsLoading(true);
      setMovementsError(null);
      try {
        return await refreshMovementOptions(includeArchived);
      } catch (loadError) {
        setMovementsError(normalizeErrorMessage(loadError, 'Unable to load active Movements.'));
        throw loadError;
      } finally {
        setMovementsLoading(false);
      }
    },
    [refreshMovementOptions],
  );
  const exitBuilder = useCallback(() => {
    allowNavigationRef.current = true;
    setRoutineBuilderDirty(false);
    setDiscardChangesVisible(false);
    setPendingExit(null);
    setEditingRoutine(null);
    setMovementOptions([]);
    router.replace('/routines');
  }, [router]);

  useEffect(() => {
    if (!builderRoute || !routineBuilderDirty) return;
    const appNavigation = navigation as unknown as NavigationEvents;
    const unsubscribeBeforeRemove = appNavigation.addListener('beforeRemove', (event) => {
      if (allowNavigationRef.current) return;
      event.preventDefault();
      if (event.data) setPendingExit(() => () => appNavigation.dispatch(event.data!.action));
      setDiscardChangesVisible(true);
    });
    const unsubscribeTabPress = appNavigation.addListener('tabPress', (event) => {
      const target = appNavigation
        .getState()
        .routes.find((route) => route.key === event.target)?.name;
      if (!target || target === 'routines') return;
      event.preventDefault();
      setPendingExit(() => () => {
        exitBuilder();
        appNavigation.dispatch({ type: 'JUMP_TO', payload: { name: target } });
      });
      setDiscardChangesVisible(true);
      // NativeTabs cannot cancel tabPress. Return to this tab on the next
      // frame, then let the shared discard confirmation decide what happens.
      requestAnimationFrame(() => appNavigation.navigate('routines'));
    });
    return () => {
      unsubscribeBeforeRemove();
      unsubscribeTabPress();
    };
  }, [builderRoute, exitBuilder, navigation, routineBuilderDirty]);

  useEffect(() => {
    let cancelled = false;
    const hasStaleData = hasLoadedRef.current;
    setLoading(!hasStaleData);
    setRefreshing(hasStaleData);
    setError(null);
    Promise.resolve()
      .then(() => {
        if (cancelled) return undefined;
        return listRoutines(getDb(), { includeArchived: showArchived });
      })
      .then((routines) => {
        if (!cancelled && routines) {
          hasLoadedRef.current = true;
          setRows(routines);
          setLoaded(true);
        }
      })
      .catch((loadError) => {
        if (!cancelled) setError(normalizeErrorMessage(loadError, 'Unable to load Routines.'));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshToken, showArchived]);

  useEffect(() => {
    getRecordingScale(getDb())
      .then(setRecordingScale)
      .catch(() => undefined);
    Promise.all([listMuscleGroups(getDb()), getDefaultUnit(getDb())])
      .then(([groups, unit]) => {
        setMuscleGroups(groups.map((group) => ({ id: group.id, name: group.name })));
        setDefaultUnit(unit);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!builderRoute) return;
    Promise.resolve()
      .then(() => loadMovementOptions(builderRoute.mode === 'edit'))
      .catch(() => undefined);
  }, [builderRoute, loadMovementOptions]);

  useEffect(() => {
    if (!builderRoute || builderRoute.mode !== 'edit') return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setEditingRoutine(null);
      setEditError(null);
      setEditLoading(true);
    });
    getRoutine(getDb(), builderRoute.routineId)
      .then((routine) => {
        if (!cancelled) {
          if (routine) setEditingRoutine(routine);
          else setEditError('Routine no longer exists.');
        }
      })
      .catch((loadError) => {
        if (!cancelled) setEditError(normalizeErrorMessage(loadError, 'Unable to open Routine.'));
      })
      .finally(() => {
        if (!cancelled) setEditLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [builderRoute, editRetryToken]);

  const requestBuilderExit = () => {
    if (!routineBuilderDirty) {
      exitBuilder();
      return;
    }
    setPendingExit(() => exitBuilder);
    setDiscardChangesVisible(true);
  };

  const discardAndContinue = () => {
    const continuation = pendingExit;
    allowNavigationRef.current = true;
    setDiscardChangesVisible(false);
    setPendingExit(null);
    setRoutineBuilderDirty(false);
    if (continuation) requestAnimationFrame(continuation);
  };

  const openCreate = () => {
    allowNavigationRef.current = false;
    setEditingRoutine(null);
    setError(null);
    setSuccessMessage(null);
    setEditError(null);
    router.replace({ pathname: '/routines', params: { builder: 'create' } });
  };

  const openEdit = (routineId: number) => {
    allowNavigationRef.current = false;
    setError(null);
    setEditError(null);
    setSuccessMessage(null);
    setExpandedRow(null);
    router.replace({
      pathname: '/routines',
      params: { builder: 'edit', routineId: String(routineId) },
    });
  };

  const discardConfirmation = (
    <UnsavedChangesModal
      visible={discardChangesVisible}
      onKeepEditing={() => setDiscardChangesVisible(false)}
      onDiscard={discardAndContinue}
    />
  );

  const refresh = () => {
    setError(null);
    if (hasLoadedRef.current) setRefreshing(true);
    else setLoading(true);
    setRefreshToken((token) => token + 1);
  };

  const updateArchive = async (routine: RoutineSummary) => {
    if (archiveBusyId !== null) return;
    setArchiveBusyId(routine.id);
    try {
      if (routine.archived) await unarchiveRoutine(getDb(), routine.id);
      else await archiveRoutine(getDb(), routine.id);
      setExpandedRow(null);
      setError(null);
      setSuccessMessage(`${routine.name} ${routine.archived ? 'restored' : 'archived'}.`);
      refresh();
    } catch (mutationError) {
      setError(normalizeErrorMessage(mutationError, 'Unable to update Routine.'));
    } finally {
      setArchiveBusyId(null);
    }
  };

  const confirmDelete = async (routine: RoutineSummary) => {
    try {
      const references = await getRoutineDeleteReferences(getDb(), routine.id);
      if (hasRoutineReferences(references)) {
        setExpandedRow(null);
        setReferencePanel({ routineName: routine.name, references });
        return;
      }
      setDeleteConfirmation(routine);
    } catch (mutationError) {
      setError(normalizeErrorMessage(mutationError, 'Unable to check Routine references.'));
    }
  };

  const deleteAfterConfirmation = async (routine: RoutineSummary) => {
    try {
      const result = await deleteRoutine(getDb(), routine.id);
      setExpandedRow(null);
      if (result.deleted) {
        setError(null);
        refresh();
      } else {
        setReferencePanel({ routineName: routine.name, references: result.references });
      }
    } catch (mutationError) {
      setError(normalizeErrorMessage(mutationError, 'Unable to delete Routine.'));
    }
  };

  if (builderRoute) {
    if (builderRoute.mode === 'edit' && editError) {
      return (
        <BuilderLoadError
          error={editError}
          onRetry={() => setEditRetryToken((token) => token + 1)}
          onCancel={requestBuilderExit}
        />
      );
    }
    if (builderRoute.mode === 'edit' && (editLoading || !editingRoutine)) {
      return <BuilderLoadingState onCancel={requestBuilderExit} />;
    }
    return (
      <>
        <RoutineBuilder
          key={(builderRoute.mode === 'edit' ? editingRoutine?.routine.id : undefined) ?? 'new'}
          routine={builderRoute.mode === 'edit' ? editingRoutine : null}
          recordingScale={recordingScale}
          movementOptions={movementOptions}
          movementsLoading={movementsLoading}
          movementsError={movementsError}
          muscleGroups={muscleGroups}
          defaultUnit={defaultUnit}
          onRefreshMovements={() => loadMovementOptions(builderRoute.mode === 'edit')}
          onCancel={requestBuilderExit}
          onDirtyChange={setRoutineBuilderDirty}
          onSaved={() => {
            setSuccessMessage(
              builderRoute.mode === 'edit' ? 'Routine updated.' : 'Routine created.',
            );
            exitBuilder();
            refresh();
          }}
        />
        {discardConfirmation}
      </>
    );
  }

  const empty = loaded && rows.length === 0;
  return (
    <EntityListScreen
      data={rows}
      keyExtractor={(routine) => String(routine.id)}
      loaded={loaded}
      loading={loading}
      refreshing={refreshing}
      loadError={error}
      loadingLabel="Loading Routines…"
      loadingAccessibilityLabel="Loading routines"
      refreshingLabel="Refreshing routines…"
      refreshingAccessibilityLabel="Refreshing routines"
      staleDataMessage="Showing the last saved routines."
      retryAccessibilityLabel="Retry loading routines"
      onRetry={refresh}
      header={
        <Box className="gap-4">
          <EntityListTitle
            action={
              !empty ? (
                <Button onPress={openCreate} accessibilityLabel="Create routine">
                  <ButtonText>Create routine</ButtonText>
                </Button>
              ) : undefined
            }
          >
            Routines
          </EntityListTitle>
          <ArchiveVisibilityToggle value={showArchived} onValueChange={setShowArchived} />
          {successMessage && (
            <Box className="rounded-xl bg-muted px-4 py-2" accessibilityLiveRegion="polite">
              <Text>{successMessage}</Text>
            </Box>
          )}
        </Box>
      }
      emptyState={
        <Box className="items-center gap-4 rounded-xl bg-card px-4 py-8">
          <Box className="items-center gap-2">
            <Text size="xl" bold>
              No Routines yet
            </Text>
            <Text className="text-center text-muted-foreground">
              Build a simple ledger for your next session.
            </Text>
          </Box>
          <Button onPress={openCreate} accessibilityLabel="Create routine">
            <ButtonText>Create routine</ButtonText>
          </Button>
        </Box>
      }
      renderItem={({ item }) => (
        <RoutineRow
          routine={item}
          expanded={expandedRow === item.id}
          archiveBusy={archiveBusyId === item.id}
          onOpen={() => void openEdit(item.id)}
          onMore={() => setExpandedRow((current) => (current === item.id ? null : item.id))}
          onArchive={() => void updateArchive(item)}
          onDelete={() => void confirmDelete(item)}
        />
      )}
    >
      <RoutineReferencesModal panel={referencePanel} onClose={() => setReferencePanel(null)} />
      <RoutineDeleteConfirmationModal
        routine={deleteConfirmation}
        onCancel={() => setDeleteConfirmation(null)}
        onConfirm={() => {
          if (!deleteConfirmation) return;
          const routine = deleteConfirmation;
          setDeleteConfirmation(null);
          void deleteAfterConfirmation(routine);
        }}
      />
      {discardConfirmation}
    </EntityListScreen>
  );
}

function BuilderStateShell({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right', 'bottom']}>
      <Box className="mx-auto w-full max-w-[800px] flex-1 items-center justify-center gap-4 px-4">
        {children}
      </Box>
    </SafeAreaView>
  );
}

function BuilderLoadingState({ onCancel }: { onCancel: () => void }) {
  return (
    <BuilderStateShell>
      <ActivityIndicator accessibilityLabel="Loading Routine" />
      <Text className="text-muted-foreground">Loading Routine…</Text>
      <Button variant="outline" onPress={onCancel} accessibilityLabel="Back to routines">
        <ButtonText>Back</ButtonText>
      </Button>
    </BuilderStateShell>
  );
}

function BuilderLoadError({
  error,
  onRetry,
  onCancel,
}: {
  error: string;
  onRetry: () => void;
  onCancel: () => void;
}) {
  return (
    <BuilderStateShell>
      <Box className="w-full gap-2 rounded-xl bg-muted p-4" accessibilityRole="alert">
        <Text className="text-destructive">{error}</Text>
        <Box className="flex-row gap-2">
          <Button variant="outline" onPress={onCancel} className="flex-1">
            <ButtonText>Back</ButtonText>
          </Button>
          <Button onPress={onRetry} className="flex-1">
            <ButtonText>Try again</ButtonText>
          </Button>
        </Box>
      </Box>
    </BuilderStateShell>
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
  onDirtyChange: (dirty: boolean) => void;
  onSaved: () => void | Promise<void>;
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
  onDirtyChange,
  onSaved,
}: RoutineBuilderProps) {
  const [initialDraft] = useState<RoutineDraft>(() =>
    createDraft(routine?.routine.name ?? '', recordingScale, routine?.entries ?? []),
  );
  const [draft, setDraft] = useState<RoutineDraft>(() =>
    createDraft(routine?.routine.name ?? '', recordingScale, routine?.entries ?? []),
  );
  const [pendingEntry, setPendingEntry] = useState<RoutineEntryDraft | null>(null);
  const [pendingEntrySource, setPendingEntrySource] = useState<'picker' | 'quickCreate' | null>(
    null,
  );
  const [editingName, setEditingName] = useState(() => !routine);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [quickCreateVisible, setQuickCreateVisible] = useState(false);
  const [quickCreateSession, setQuickCreateSession] = useState(0);
  const [quickCreate, dispatchQuickCreate] = useReducer(
    quickCreateReducer,
    createQuickCreateState(),
  );
  const ledgerScrollRef = useRef<ScrollView>(null);
  const ledgerOffsetRef = useRef(0);
  const ledgerLayoutsRef = useRef<Record<number, number>>({});
  const pendingRevealRef = useRef<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(() => new Set());
  const [saveAttempted, setSaveAttempted] = useState(false);
  const validationDraft =
    draft.recordingScale === recordingScale ? draft : { ...draft, recordingScale };
  const validation = validateDraft(validationDraft);
  const isValidationVisible = (field: string) => saveAttempted || touchedFields.has(field);
  const visibleEntryErrors = (movementId: number, errors: string[]) =>
    errors.filter((validationError) => {
      if (validationError.startsWith('Working-set'))
        return isValidationVisible(entryFieldKey(movementId, 'workingSetCount'));
      if (validationError.includes('Rep')) {
        return (
          isValidationVisible(entryFieldKey(movementId, 'repMin')) ||
          isValidationVisible(entryFieldKey(movementId, 'repMax'))
        );
      }
      if (validationError.includes('target must'))
        return isValidationVisible(entryFieldKey(movementId, 'proximityValue'));
      if (validationError.startsWith('Tempo'))
        return isValidationVisible(entryFieldKey(movementId, 'tempo'));
      return saveAttempted;
    });
  const markFieldTouched = (field: string) => {
    setTouchedFields((current) => (current.has(field) ? current : new Set(current).add(field)));
  };
  const selectedIds = useMemo(
    () => draft.entries.map((entry) => entry.movementId),
    [draft.entries],
  );
  const selectedMovements = draft.entries
    .map((entry) => movementOptions.find((movement) => movement.id === entry.movementId))
    .filter((movement): movement is CatalogMovement => movement !== undefined);
  const pendingMovement =
    pendingEntry && movementOptions.find((movement) => movement.id === pendingEntry.movementId);
  const pendingErrors = pendingEntry ? validateEntry(pendingEntry, recordingScale) : [];
  const visiblePendingErrors = pendingEntry
    ? visibleEntryErrors(pendingEntry.movementId, pendingErrors)
    : [];
  const dirty =
    isRoutineDraftDirty(draft, initialDraft) ||
    pendingEntry !== null ||
    isQuickCreateDraftDirty(quickCreate, defaultUnit);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  const updateDraft = (next: RoutineDraft) => {
    setDraft(next);
    setError(null);
  };
  const updatePending = (field: RoutineEntryTargetField, value: string) => {
    if (pendingEntry) markFieldTouched(entryFieldKey(pendingEntry.movementId, field));
    setPendingEntry((entry) => (entry ? { ...entry, [field]: value } : entry));
  };
  const addPending = () => {
    if (!pendingEntry || pendingErrors.length > 0) return;
    const returnToPicker = pendingEntrySource === 'quickCreate';
    const added = addDraftEntry(draft, pendingEntry.movementId);
    updateDraft({
      ...added,
      entries: added.entries.map((entry) =>
        entry.movementId === pendingEntry.movementId ? pendingEntry : entry,
      ),
    });
    setPendingEntry(null);
    setPendingEntrySource(null);
    if (returnToPicker) setPickerVisible(true);
  };
  const cancelPending = () => {
    const returnToPicker = pendingEntrySource === 'quickCreate';
    setPendingEntry(null);
    setPendingEntrySource(null);
    if (returnToPicker) setPickerVisible(true);
  };
  const beginMovementSetup = (movementId: number, source: 'picker' | 'quickCreate' = 'picker') => {
    setPendingEntry(createDraftEntry(movementId));
    setPendingEntrySource(source);
    setPickerVisible(false);
  };
  const chooseMovement = (movement: CatalogMovement) => {
    if (!canSelectMovement(movement, selectedIds)) return;
    beginMovementSetup(movement.id);
  };
  const startQuickCreate = (name: string) => {
    if (!quickCreate.draft) dispatchQuickCreate({ type: 'quickCreateStarted', name });
    setPickerVisible(false);
    setQuickCreateSession((session) => session + 1);
    setQuickCreateVisible(true);
  };
  const closeQuickCreate = () => {
    dispatchQuickCreate({ type: 'modalCancelled' });
    setQuickCreateVisible(false);
    setPickerVisible(true);
  };
  const handleQuickCreateMovement = async (
    movement: Movement,
    action: 'movementSaved' | 'movementSelected',
  ) => {
    if (action === 'movementSelected') dispatchQuickCreate({ type: 'duplicateNavigated' });
    setError(null);
    try {
      const refreshedMovements = await onRefreshMovements();
      const catalogMovement = refreshedMovements.find((candidate) => candidate.id === movement.id);
      if (!catalogMovement)
        throw new Error('The new Movement could not be loaded for target setup.');
      dispatchQuickCreate({ type: action, movement: { id: movement.id, name: movement.name } });
      setQuickCreateVisible(false);
      if (selectedIds.includes(catalogMovement.id)) {
        setPickerVisible(false);
        onRevealExisting(catalogMovement.id);
        return;
      }
      if (!canSelectMovement(catalogMovement, selectedIds)) {
        throw new Error('Archived Movements cannot be added to a new Routine.');
      }
      beginMovementSetup(catalogMovement.id, 'quickCreate');
    } catch (loadError) {
      setError(normalizeErrorMessage(loadError, 'Unable to continue to target setup.'));
    }
  };
  const onQuickCreateSaved = (movement: Movement) =>
    handleQuickCreateMovement(movement, 'movementSaved');
  const onQuickCreateDuplicate = (movement: Movement) =>
    handleQuickCreateMovement(movement, 'movementSelected');
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
    if (saving) return;
    setSaveAttempted(true);
    if (!validation.valid) {
      if (validation.nameError) setEditingName(true);
      else {
        const firstInvalidEntry = draft.entries.find(
          (entry) => (validation.entryErrors[entry.movementId]?.length ?? 0) > 0,
        );
        if (firstInvalidEntry) setEditingEntryId(firstInvalidEntry.movementId);
      }
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input = draftToInput({ ...draft, recordingScale });
      if (routine) await updateRoutine(getDb(), routine.routine.id, input);
      else await createRoutine(getDb(), input);
      onSaved();
    } catch (saveError) {
      setError(normalizeErrorMessage(saveError, 'Unable to save Routine.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      className="bg-background"
      style={{ flex: 1 }}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <Box style={{ flex: 1 }}>
        <ScrollView
          ref={ledgerScrollRef}
          contentContainerClassName="mx-auto w-full max-w-[800px] gap-4 px-4 pb-28 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          <Box className="flex-row items-center justify-between gap-4">
            <Text size="2xl" bold className="min-w-0 flex-1">
              {routine ? 'Edit Routine' : 'New Routine'}
            </Text>
            <Button variant="ghost" onPress={onCancel} accessibilityLabel="Back to routines">
              <ButtonText>Back</ButtonText>
            </Button>
          </Box>

          <Box className="rounded-xl bg-card px-4 py-3">
            {editingName ? (
              <Box className="gap-2">
                <Box className="flex-row items-center justify-between gap-2">
                  <Text size="sm" bold>
                    Routine name
                  </Text>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-11 min-w-11"
                    onPress={() => setEditingName(false)}
                    accessibilityLabel="Done editing routine name"
                  >
                    <ButtonIcon as={Check} />
                  </Button>
                </Box>
                <Input isInvalid={Boolean(validation.nameError && isValidationVisible('name'))}>
                  <InputField
                    value={draft.name}
                    onChangeText={(name) => {
                      markFieldTouched('name');
                      updateDraft({ ...draft, name });
                    }}
                    onBlur={() => markFieldTouched('name')}
                    onSubmitEditing={() => setEditingName(false)}
                    placeholder="e.g. Upper body"
                    accessibilityLabel="Routine name"
                    autoCapitalize="sentences"
                    autoFocus={!routine}
                  />
                </Input>
                {validation.nameError && isValidationVisible('name') && (
                  <Text size="sm" className="text-destructive">
                    {validation.nameError}
                  </Text>
                )}
              </Box>
            ) : (
              <Box className="flex-row items-center gap-3">
                <Box className="min-w-0 flex-1 gap-1">
                  <Text size="xs" bold className="text-muted-foreground">
                    Routine name
                  </Text>
                  <Text size="lg" bold numberOfLines={1}>
                    {draft.name || 'Unnamed routine'}
                  </Text>
                </Box>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-11 min-w-11"
                  onPress={() => setEditingName(true)}
                  accessibilityLabel="Edit routine name"
                >
                  <ButtonIcon as={Pencil} />
                </Button>
              </Box>
            )}
          </Box>

          <Box
            className="gap-4 rounded-xl bg-card p-4"
            onLayout={(event) => {
              ledgerOffsetRef.current = event.nativeEvent.layout.y;
            }}
          >
            <Box className="flex-row items-center justify-between">
              <Text size="lg" bold>
                Ledger
              </Text>
              <Text size="sm" className="text-muted-foreground">
                {movementCountLabel(draft.entries.length)}
              </Text>
            </Box>
            {selectedMovements.length === 0 ? (
              <Box className="gap-2 py-4">
                <Text className="text-muted-foreground">
                  Add a Movement below to start your Ledger.
                </Text>
              </Box>
            ) : (
              selectedMovements.map((movement, index) => (
                <RoutineEntryRow
                  key={movement.id}
                  index={index}
                  entryCount={draft.entries.length}
                  movement={movement}
                  entry={draft.entries.find((entry) => entry.movementId === movement.id)!}
                  recordingScale={recordingScale}
                  errors={visibleEntryErrors(
                    movement.id,
                    validation.entryErrors[movement.id] ?? [],
                  )}
                  editing={editingEntryId === movement.id}
                  onEdit={() =>
                    setEditingEntryId((current) => (current === movement.id ? null : movement.id))
                  }
                  onTargetChange={(field, value) => {
                    markFieldTouched(entryFieldKey(movement.id, field));
                    updateDraft(updateDraftTarget(draft, movement.id, field, value));
                  }}
                  onTargetBlur={(field) => markFieldTouched(entryFieldKey(movement.id, field))}
                  onMove={(from, to) => updateDraft(reorderDraftEntry(draft, from, to))}
                  onRemove={() => {
                    setEditingEntryId(null);
                    updateDraft(removeDraftEntry(draft, movement.id));
                  }}
                  onLayout={(event) => {
                    ledgerLayoutsRef.current[movement.id] =
                      ledgerOffsetRef.current + event.nativeEvent.layout.y;
                    if (pendingRevealRef.current === movement.id) {
                      pendingRevealRef.current = null;
                      requestAnimationFrame(() => {
                        scrollToLedgerEntry(movement.id);
                      });
                    }
                  }}
                />
              ))
            )}
          </Box>

          {pendingEntry && pendingMovement && (
            <Box className="gap-4 rounded-xl bg-card p-4">
              <Box className="flex-row items-center justify-between">
                <Box className="min-w-0 flex-1 gap-1">
                  <Text size="lg" bold>
                    Configure Movement
                  </Text>
                  <Text className="text-muted-foreground">{pendingMovement.name}</Text>
                </Box>
                <Button
                  variant="ghost"
                  onPress={cancelPending}
                  accessibilityLabel={
                    pendingEntrySource === 'quickCreate'
                      ? 'Back to movement picker'
                      : 'Cancel movement setup'
                  }
                >
                  <ButtonText>
                    {pendingEntrySource === 'quickCreate' ? 'Back to picker' : 'Cancel'}
                  </ButtonText>
                </Button>
              </Box>
              <RoutineTargetFields
                entry={pendingEntry}
                recordingScale={recordingScale}
                errors={visiblePendingErrors}
                onChange={updatePending}
                onFieldBlur={(field) =>
                  markFieldTouched(entryFieldKey(pendingEntry.movementId, field))
                }
                onClearRepRange={() => {
                  markFieldTouched(entryFieldKey(pendingEntry.movementId, 'repMin'));
                  markFieldTouched(entryFieldKey(pendingEntry.movementId, 'repMax'));
                  setPendingEntry((entry) =>
                    entry ? { ...entry, repMin: '', repMax: '' } : entry,
                  );
                }}
              />
              <Button
                variant="outline"
                onPress={addPending}
                disabled={pendingErrors.length > 0}
                accessibilityLabel={`Add ${pendingMovement.name} to routine`}
              >
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
            <ButtonText>{movementsLoading ? 'Loading movements…' : 'Add movement'}</ButtonText>
          </Button>
          {movementsError && (
            <Box className="gap-2 rounded-xl bg-muted px-4 py-4" accessibilityRole="alert">
              <Text className="text-destructive">{movementsError}</Text>
              <Button variant="outline" size="sm" onPress={() => void onRefreshMovements()}>
                <ButtonText>Try again</ButtonText>
              </Button>
            </Box>
          )}
          {draft.lastRemoved && (
            <Box
              className="flex-row items-center gap-2 rounded-xl bg-muted px-4 py-4"
              accessibilityLiveRegion="polite"
            >
              <Text className="min-w-0 flex-1">
                {movementName(draft.lastRemoved.entry.movementId, movementOptions)} removed.
              </Text>
              <Button
                variant="link"
                size="sm"
                className="px-0"
                onPress={() => updateDraft(undoDraftRemoval(draft))}
                accessibilityLabel="Undo removed movement"
              >
                <ButtonText>Undo</ButtonText>
              </Button>
            </Box>
          )}
          {error && (
            <Box className="gap-2 rounded-xl bg-muted px-4 py-4" accessibilityRole="alert">
              <Text className="text-destructive">{error}</Text>
              <Button variant="outline" size="sm" onPress={() => void save()} disabled={saving}>
                <ButtonText>Try again</ButtonText>
              </Button>
            </Box>
          )}
        </ScrollView>
      </Box>
      <Box className="border-t border-border bg-background px-4 py-3">
        <Box className="mx-auto w-full max-w-[800px] flex-row items-center gap-3">
          <Box className="min-w-0 flex-1 gap-0.5">
            <Text size="sm" bold>
              {saving ? 'Saving…' : validation.valid ? 'Ready to save' : 'Finish setup'}
            </Text>
            <Text size="xs" className="text-muted-foreground" numberOfLines={1}>
              {validation.valid
                ? `${movementCountLabel(draft.entries.length)} · edit targets from each row`
                : ((validation.nameError && isValidationVisible('name')
                    ? validation.nameError
                    : null) ??
                  (validation.entriesError && saveAttempted ? validation.entriesError : null) ??
                  (saveAttempted
                    ? 'Review the highlighted targets.'
                    : 'Add a routine name and a Movement to begin.'))}
            </Text>
          </Box>
          <Button onPress={() => void save()} disabled={saving} accessibilityLabel="Save routine">
            <ButtonText>
              {saving ? 'Saving…' : routine ? 'Save changes' : 'Save routine'}
            </ButtonText>
          </Button>
        </Box>
      </Box>
      <MovementPickerModal
        visible={pickerVisible}
        options={movementOptions}
        selectedIds={selectedIds}
        onClose={() => setPickerVisible(false)}
        onCreate={startQuickCreate}
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
          closeLabel="Back"
          closeAccessibilityLabel="Back to movement picker"
          onClose={closeQuickCreate}
          onSaved={(movement) => {
            void onQuickCreateSaved(movement);
          }}
          onDuplicate={(movement) => {
            void onQuickCreateDuplicate(movement);
          }}
          onDraftChange={(draft) => dispatchQuickCreate({ type: 'draftChanged', draft })}
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
  editing: boolean;
  onEdit: () => void;
  onTargetChange: (field: RoutineEntryTargetField, value: string) => void;
  onTargetBlur: (field: RoutineEntryTargetField) => void;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
};

function RoutineEntryRow({
  index,
  entryCount,
  movement,
  entry,
  recordingScale,
  errors,
  editing,
  onEdit,
  onTargetChange,
  onTargetBlur,
  onMove,
  onRemove,
  onLayout,
}: RoutineEntryRowProps) {
  const moveTo = (from: number, to: number) => {
    if (to < 0 || to >= entryCount || from === to) return;
    onMove(from, to);
    AccessibilityInfo.announceForAccessibility(
      `Moved ${movement.name} to position ${to + 1} of ${entryCount}.`,
    );
  };
  return (
    <Box
      onLayout={onLayout}
      className={
        movement.archived
          ? 'gap-3 border-t border-border py-3 opacity-50'
          : 'gap-3 border-t border-border py-3'
      }
    >
      <Box className="flex-row items-center gap-2">
        <DragHandle index={index} label={movement.name} onMove={moveTo} />
        <Text size="xs" className="text-muted-foreground">
          {String(index + 1).padStart(2, '0')}
        </Text>
        <Box className="min-w-0 flex-1 gap-1">
          <Box className="flex-row items-center gap-2">
            <Text bold className="min-w-0 flex-1" numberOfLines={1}>
              {movement.name}
            </Text>
            {movement.archived && (
              <Text size="xs" bold className="uppercase text-muted-foreground">
                Archived
              </Text>
            )}
          </Box>
          {!editing && <RoutineEntrySummary entry={entry} recordingScale={recordingScale} />}
        </Box>
        <Button
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11"
          onPress={onEdit}
          accessibilityLabel={`${editing ? 'Done editing' : 'Edit targets for'} ${movement.name}`}
          accessibilityHint={editing ? 'Hides the target fields' : 'Shows the target fields'}
        >
          <ButtonIcon as={editing ? Check : Pencil} />
        </Button>
      </Box>
      {editing && (
        <>
          <RoutineTargetFields
            entry={entry}
            recordingScale={recordingScale}
            errors={errors}
            onChange={onTargetChange}
            onFieldBlur={onTargetBlur}
            compact
          />
          <Box className="flex-row items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="min-h-11 min-w-11"
              onPress={() => moveTo(index, index - 1)}
              disabled={index === 0}
              accessibilityLabel={`Move ${movement.name} up`}
              accessibilityHint="Moves this movement earlier in the routine"
            >
              <ButtonIcon as={ChevronUp} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="min-h-11 min-w-11"
              onPress={() => moveTo(index, index + 1)}
              disabled={index === entryCount - 1}
              accessibilityLabel={`Move ${movement.name} down`}
              accessibilityHint="Moves this movement later in the routine"
            >
              <ButtonIcon as={ChevronDown} />
            </Button>
            <Button
              variant="link"
              size="sm"
              className="ml-auto min-h-11 px-2"
              onPress={onRemove}
              accessibilityLabel={`Remove ${movement.name}`}
            >
              <ButtonText>Remove movement</ButtonText>
            </Button>
          </Box>
        </>
      )}
      {!editing && errors.length > 0 && (
        <Text size="sm" className="text-destructive">
          {errors[0]} Edit targets to fix.
        </Text>
      )}
    </Box>
  );
}

function RoutineEntrySummary({
  entry,
  recordingScale,
}: {
  entry: RoutineEntryDraft;
  recordingScale: RecordingScale;
}) {
  const items = [
    entry.workingSetCount.trim()
      ? `${entry.workingSetCount} ${entry.workingSetCount === '1' ? 'set' : 'sets'}`
      : 'Sets not set',
    entry.repMin.trim() && entry.repMax.trim()
      ? `${entry.repMin}–${entry.repMax} reps`
      : 'Reps not set',
    entry.proximityValue.trim()
      ? `${recordingScale.toUpperCase()} ${entry.proximityValue}`
      : `${recordingScale.toUpperCase()} not set`,
    entry.tempo.trim() ? `Tempo ${entry.tempo}` : 'Tempo not set',
  ];
  return (
    <Box className="flex-row flex-wrap gap-x-2 gap-y-1">
      {items.map((item) => (
        <Text key={item} size="sm" numberOfLines={1} className="shrink-0 text-muted-foreground">
          {item}
        </Text>
      ))}
    </Box>
  );
}

function DragHandle({
  index,
  label,
  onMove,
}: {
  index: number;
  label: string;
  onMove: (from: number, to: number) => void;
}) {
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderRelease: (_, gesture) => {
          const offset = gesture.dy > 96 ? 1 : gesture.dy < -96 ? -1 : 0;
          if (offset) onMove(index, index + offset);
        },
      }),
    [index, onMove],
  );
  return (
    <Button
      {...responder.panHandlers}
      variant="ghost"
      size="icon"
      accessibilityLabel={`Drag ${label}`}
      accessibilityHint="Drag vertically to reorder this movement"
      className="min-h-11 min-w-11 bg-muted"
    >
      <ButtonIcon as={GripVertical} />
    </Button>
  );
}

function RoutineTargetFields({
  entry,
  recordingScale,
  errors,
  onChange,
  onFieldBlur,
  onClearRepRange,
  compact = false,
}: {
  entry: RoutineEntryDraft;
  recordingScale: RecordingScale;
  errors: string[];
  onChange: (field: RoutineEntryTargetField, value: string) => void;
  onFieldBlur?: (field: RoutineEntryTargetField) => void;
  onClearRepRange?: () => void;
  compact?: boolean;
}) {
  const repError = errors.some((error) => error.includes('Rep'));
  const fields = (
    <>
      <TargetField
        compact={compact}
        label="Sets"
        value={entry.workingSetCount}
        error={errors.find((error) => error.startsWith('Working-set'))}
        onChange={(value) => onChange('workingSetCount', value)}
        onBlur={() => onFieldBlur?.('workingSetCount')}
        onClear={() => onChange('workingSetCount', '')}
        keyboardType="number-pad"
      />
      <Box className={compact ? 'basis-1/2 min-w-0 flex-1 gap-1' : 'gap-2'}>
        <Box className="flex-row items-center justify-between">
          <Text size="xs" bold className={compact ? 'flex-1 text-center' : undefined}>
            Reps
          </Text>
          {!compact && onClearRepRange && (entry.repMin !== '' || entry.repMax !== '') && (
            <Button
              variant="link"
              size="sm"
              className="min-h-11 min-w-11 px-2"
              onPress={onClearRepRange}
              accessibilityLabel="Clear rep range"
            >
              <ButtonText>Clear</ButtonText>
            </Button>
          )}
        </Box>
        <Box className="flex-row items-center gap-2">
          <Box className="min-w-0 flex-1">
            <Input isInvalid={repError}>
              <InputField
                value={entry.repMin}
                onChangeText={(value) => onChange('repMin', value)}
                onBlur={() => onFieldBlur?.('repMin')}
                placeholder="Min"
                accessibilityLabel="Minimum reps"
                keyboardType="number-pad"
                textAlign="center"
              />
            </Input>
          </Box>
          <Text size="sm" className="text-muted-foreground">
            –
          </Text>
          <Box className="min-w-0 flex-1">
            <Input isInvalid={repError}>
              <InputField
                value={entry.repMax}
                onChangeText={(value) => onChange('repMax', value)}
                onBlur={() => onFieldBlur?.('repMax')}
                placeholder="Max"
                accessibilityLabel="Maximum reps"
                keyboardType="number-pad"
                textAlign="center"
              />
            </Input>
          </Box>
        </Box>
        {errors
          .filter((error) => error.includes('Rep'))
          .map((error) => (
            <Text key={error} size="sm" className="text-destructive">
              {error}
            </Text>
          ))}
      </Box>
      <TargetField
        compact={compact}
        label={recordingScale.toUpperCase()}
        value={entry.proximityValue}
        error={errors.find((error) => error.includes('target must'))}
        onChange={(value) => onChange('proximityValue', value)}
        onBlur={() => onFieldBlur?.('proximityValue')}
        onClear={() => onChange('proximityValue', '')}
        keyboardType="decimal-pad"
      />
      <TargetField
        compact={compact}
        label="Tempo"
        value={entry.tempo}
        error={errors.find((error) => error.startsWith('Tempo'))}
        onChange={(value) => onChange('tempo', value)}
        onBlur={() => onFieldBlur?.('tempo')}
        onClear={() => onChange('tempo', '')}
        placeholder="3-1-1-0"
      />
    </>
  );
  return compact ? (
    <Box className="flex-row flex-wrap gap-2">{fields}</Box>
  ) : (
    <Box className="gap-2">{fields}</Box>
  );
}

type TargetFieldProps = {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onClear: () => void;
  placeholder?: string;
  keyboardType?: 'number-pad' | 'decimal-pad';
  compact?: boolean;
};
function TargetField({
  label,
  value,
  error,
  onChange,
  onBlur,
  onClear,
  placeholder,
  keyboardType,
  compact = false,
}: TargetFieldProps) {
  return (
    <Box className={compact ? 'basis-1/2 min-w-0 flex-1 gap-1' : 'gap-2'}>
      <Box className="flex-row items-center justify-between">
        <Text size="xs" bold>
          {label}
        </Text>
        {!compact && value !== '' && (
          <Button
            variant="link"
            size="sm"
            className="min-h-11 min-w-11 px-2"
            onPress={onClear}
            accessibilityLabel={`Clear ${label}`}
          >
            <ButtonText>Clear</ButtonText>
          </Button>
        )}
      </Box>
      <Input isInvalid={Boolean(error)}>
        <InputField
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          accessibilityLabel={label}
          keyboardType={keyboardType}
          textAlign={compact ? 'center' : undefined}
        />
      </Input>
      {error && (
        <Text size="sm" className="text-destructive">
          {error}
        </Text>
      )}
    </Box>
  );
}

function entryFieldKey(movementId: number, field: RoutineEntryTargetField): string {
  return `entry:${movementId}:${field}`;
}

function movementName(id: number, options: CatalogMovement[]): string {
  return options.find((movement) => movement.id === id)?.name ?? 'Movement';
}

function movementCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'Movement' : 'Movements'}`;
}
