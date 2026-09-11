import { useEffect, useRef, useState } from 'react';
import {
  ArchiveVisibilityToggle,
  EntityListScreen,
  EntityListTitle,
} from '@/components/app/entity-list-screen';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
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
import { normalizeErrorMessage } from '@/shared/error-message';
import { MovementEditorModal } from './movement-editor-modal';
import { DeleteConfirmationModal } from './components/delete-confirmation-modal';
import { MovementRow } from './components/movement-row';
import { ReferencesModal } from './components/references-modal';
import { MuscleGroupPickerModal } from './components/muscle-group-picker-modal';

const ALL = 'All' as const;
type Filter = typeof ALL | MuscleGroupName;
type ArchiveUndo = { id: number; name: string; archived: boolean };

/**
 * Catalog browse (issue #7): a flat A–Z screen of movements. Each row shows the
 * movement name and its muscle-group chip; a labeled muscle-group chooser narrows
 * the list; a name search combines with the active filter; a "show archived"
 * toggle (default off) gates archived rows entirely —
 * they only appear, muted with an "Archived" tag, when revealed. An empty state
 * appears when nothing matches. Volume-landmark numbers never appear here: this
 * is the identity list, not the measurement one. Quick-create remains a shared
 * capability for future recording and routine-building entry points, not a
 * catalog surface.
 */
export default function CatalogScreen() {
  const [groups, setGroups] = useState<{ id: number; name: MuscleGroupName }[]>([]);
  const [filter, setFilter] = useState<Filter>(ALL);
  const [musclePickerVisible, setMusclePickerVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [rows, setRows] = useState<CatalogMovement[]>([]);
  const [loaded, setLoaded] = useState(false);
  const hasLoadedRef = useRef(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogRefreshing, setCatalogRefreshing] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
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
  const [feedback, setFeedback] = useState<string | null>(null);
  const [archiveUndo, setArchiveUndo] = useState<ArchiveUndo | null>(null);
  const [archiveBusyId, setArchiveBusyId] = useState<number | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const archiveUndoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      if (archiveUndoTimerRef.current) clearTimeout(archiveUndoTimerRef.current);
    };
  }, []);

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
        if (!cancelled)
          setGroups(
            gs.map((g) => ({
              id: g.id,
              name: g.name as MuscleGroupName,
            })),
          );
      })
      .catch((e) => console.error('Unable to load muscle groups', e));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const hasStaleData = hasLoadedRef.current;
    setCatalogLoading(!hasStaleData);
    setCatalogRefreshing(hasStaleData);
    setCatalogError(null);

    Promise.resolve()
      .then(() =>
        listMovements(getDb(), {
          muscleGroup: filter === ALL ? undefined : filter,
          query: query.trim() || undefined,
          includeArchived: showArchived,
        }),
      )
      .then((ms) => {
        if (!cancelled) {
          hasLoadedRef.current = true;
          setRows(ms);
          setLoaded(true);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setCatalogError(normalizeErrorMessage(loadError, 'Unable to load catalog.'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCatalogLoading(false);
          setCatalogRefreshing(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [filter, query, showArchived, refreshToken]);

  const refresh = () => {
    setCatalogError(null);
    if (hasLoadedRef.current) setCatalogRefreshing(true);
    else setCatalogLoading(true);
    setRefreshToken((value) => value + 1);
  };
  const showFeedback = (message: string) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback(message);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
      feedbackTimerRef.current = null;
    }, 6000);
  };
  const clearArchiveUndo = () => {
    if (archiveUndoTimerRef.current) clearTimeout(archiveUndoTimerRef.current);
    archiveUndoTimerRef.current = null;
    setArchiveUndo(null);
  };
  const offerArchiveUndo = (movement: CatalogMovement, archived: boolean) => {
    clearArchiveUndo();
    setArchiveUndo({ id: movement.id, name: movement.name, archived });
    archiveUndoTimerRef.current = setTimeout(() => {
      setArchiveUndo(null);
      archiveUndoTimerRef.current = null;
    }, 6000);
  };
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
      setDeleteBlockedRows((current) => ({
        ...current,
        [movement.id]: hasMovementReferences(references),
      }));
      setExpandedRow(movement.id);
    } catch (mutationError) {
      setError(normalizeErrorMessage(mutationError, 'Unable to check movement references.'));
    }
  };

  const updateArchive = async (movement: CatalogMovement) => {
    if (archiveBusyId !== null) return;
    setArchiveBusyId(movement.id);
    try {
      const updated = movement.archived
        ? await unarchiveMovement(getDb(), movement.id)
        : await archiveMovement(getDb(), movement.id);
      const archived = updated.archived === 1;
      setExpandedRow(null);
      setError(null);
      offerArchiveUndo(movement, archived);
      showFeedback(`${movement.name} ${archived ? 'archived' : 'restored'}.`);
      refresh();
    } catch (mutationError) {
      setError(normalizeErrorMessage(mutationError, 'Unable to update movement.'));
    } finally {
      setArchiveBusyId(null);
    }
  };

  const undoArchive = async () => {
    const pending = archiveUndo;
    if (!pending || archiveBusyId !== null) return;
    clearArchiveUndo();
    setArchiveBusyId(pending.id);
    try {
      const updated = pending.archived
        ? await unarchiveMovement(getDb(), pending.id)
        : await archiveMovement(getDb(), pending.id);
      const archived = updated.archived === 1;
      setError(null);
      showFeedback(`${pending.name} ${archived ? 'archived' : 'restored'}.`);
      refresh();
    } catch (mutationError) {
      setError(normalizeErrorMessage(mutationError, 'Unable to undo archive change.'));
    } finally {
      setArchiveBusyId(null);
    }
  };

  const showReferences = async (movement: CatalogMovement) => {
    try {
      const references = await getMovementDeleteReferences(getDb(), movement.id);
      setExpandedRow(null);
      setReferencePanel({ movementName: movement.name, references });
    } catch (mutationError) {
      setError(normalizeErrorMessage(mutationError, 'Unable to check movement references.'));
    }
  };

  const deleteAfterConfirmation = async (movement: CatalogMovement) => {
    clearArchiveUndo();
    try {
      const result = await deleteMovement(getDb(), movement.id);
      setExpandedRow(null);
      if (result.deleted) {
        setError(null);
        showFeedback(`${movement.name} deleted.`);
        refresh();
      } else {
        setReferencePanel({
          movementName: movement.name,
          references: result.references,
        });
      }
    } catch (mutationError) {
      setError(normalizeErrorMessage(mutationError, 'Unable to delete movement.'));
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
      setError(normalizeErrorMessage(mutationError, 'Unable to check movement references.'));
      return;
    }

    setDeleteConfirmation(movement);
  };

  const filterOptions = [ALL, ...groups.map((group) => group.name)] as Filter[];
  const hasActiveFilters = filter !== ALL || query.trim().length > 0 || showArchived;
  const resultCountLabel = catalogLoading ? 'Loading…' : movementCountLabel(rows.length);

  return (
    <EntityListScreen
      data={rows}
      keyExtractor={(r) => String(r.id)}
      keyboardShouldPersistTaps="handled"
      loaded={loaded}
      loading={catalogLoading}
      refreshing={catalogRefreshing}
      loadError={catalogError}
      loadingLabel="Loading movements…"
      loadingAccessibilityLabel="Loading movements"
      refreshingLabel="Refreshing catalog…"
      refreshingAccessibilityLabel="Refreshing catalog"
      staleDataMessage="Showing the last saved results."
      retryAccessibilityLabel="Retry loading catalog"
      onRetry={refresh}
      header={
        <Box className="gap-4">
          <EntityListTitle
            action={
              <Button
                variant="outline"
                size="icon"
                onPress={openCreate}
                disabled={!defaultUnitLoaded}
                accessibilityLabel="Add movement"
              >
                <ButtonText>+</ButtonText>
              </Button>
            }
          >
            Catalog
          </EntityListTitle>

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

          <Box className="gap-2">
            <Text size="sm" bold>
              Muscle group
            </Text>
            <Box className="flex-row items-center gap-3">
              <Button
                variant={filter === ALL ? 'outline' : 'default'}
                size="sm"
                className="min-w-0 flex-1 justify-start"
                onPress={() => setMusclePickerVisible(true)}
                accessibilityLabel={`Filter by muscle group: ${filter === ALL ? 'All muscle groups' : filter}`}
                accessibilityState={{
                  expanded: musclePickerVisible,
                }}
              >
                <ButtonText>{filter === ALL ? 'All muscle groups' : filter}</ButtonText>
              </Button>
              <Text size="sm" className="text-muted-foreground">
                {resultCountLabel}
              </Text>
            </Box>
          </Box>

          <ArchiveVisibilityToggle
            value={showArchived}
            onValueChange={setShowArchived}
            trailingAction={
              hasActiveFilters ? (
                <Button
                  variant="link"
                  size="sm"
                  className="px-0"
                  onPress={() => {
                    setFilter(ALL);
                    setQuery('');
                    setShowArchived(false);
                    setMusclePickerVisible(false);
                  }}
                  accessibilityLabel="Clear catalog filters"
                >
                  <ButtonText>Clear filters</ButtonText>
                </Button>
              ) : undefined
            }
          />
          {feedback && (
            <Box
              className="flex-row items-center gap-3 rounded-xl bg-muted px-4 py-3"
              accessibilityLiveRegion="polite"
            >
              <Text className="min-w-0 flex-1">{feedback}</Text>
              {archiveUndo && (
                <Button
                  variant="link"
                  size="sm"
                  className="px-0"
                  onPress={() => void undoArchive()}
                  disabled={archiveBusyId !== null}
                >
                  <ButtonText>Undo</ButtonText>
                </Button>
              )}
            </Box>
          )}
          {error && (
            <Box
              className="flex-row items-center gap-3 rounded-xl bg-muted px-4 py-4"
              accessibilityRole="alert"
            >
              <Text className="min-w-0 flex-1 text-destructive">{error}</Text>
              <Button variant="link" size="sm" className="px-0" onPress={() => setError(null)}>
                <ButtonText>Dismiss</ButtonText>
              </Button>
            </Box>
          )}
        </Box>
      }
      emptyState={
        <Box className="items-center rounded-xl bg-card px-4 py-8">
          <Text className="text-muted-foreground">No movements match</Text>
        </Box>
      }
      renderItem={({ item }) => (
        <MovementRow
          movement={item}
          expanded={expandedRow === item.id}
          deleteBlocked={deleteBlockedRows[item.id] ?? false}
          archiveBusy={archiveBusyId === item.id}
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
    >
      <MovementEditorModal
        key={`${editorVisible}-${editorMovement?.id ?? 'new'}`}
        visible={editorVisible}
        movement={editorMovement}
        muscleGroups={groups}
        defaultUnit={defaultUnit ?? DEFAULT_UNIT}
        onClose={() => setEditorVisible(false)}
        onSaved={(saved) => {
          clearArchiveUndo();
          setEditorVisible(false);
          showFeedback(`${saved.name} saved.`);
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
      <MuscleGroupPickerModal
        key={musclePickerVisible ? 'open' : 'closed'}
        visible={musclePickerVisible}
        options={filterOptions}
        selected={filter}
        onClose={() => setMusclePickerVisible(false)}
        onSelect={(option) => {
          setFilter(option as Filter);
          setMusclePickerVisible(false);
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
    </EntityListScreen>
  );
}

function movementCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'movement' : 'movements'}`;
}
