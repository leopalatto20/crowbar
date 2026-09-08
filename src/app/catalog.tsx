import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { getDb, listMovements, listMuscleGroups, type CatalogMovement } from '@/db';
import type { MuscleGroupName } from '@/db/constants';
import { useTheme } from '@/hooks/use-theme';

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
	const insets = useSafeAreaInsets();
	const theme = useTheme();

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

	const chipStyle = useCallback(
		(selected: boolean) => ({
			backgroundColor: selected ? theme.text : theme.backgroundElement,
		}),
		[theme],
	);
	const chipTextStyle = useCallback(
		(selected: boolean) => ({ color: selected ? theme.background : theme.textSecondary }),
		[theme],
	);

	const contentContainer = useMemo(
		() => [
			styles.content,
			{
				paddingTop: insets.top + Spacing.three,
				paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
				paddingLeft: insets.left + Spacing.three,
				paddingRight: insets.right + Spacing.three,
			},
		],
		[insets],
	);

	return (
		<ThemedView style={styles.container}>
			<FlatList
				style={styles.list}
				contentContainerStyle={contentContainer}
				data={rows}
				keyExtractor={(r) => String(r.id)}
				keyboardShouldPersistTaps="handled"
				ListHeaderComponent={
					<ThemedView style={styles.header}>
						<ThemedText type="title" style={styles.title}>
							Catalog
						</ThemedText>

						<ThemedView type="backgroundElement" style={styles.searchBox}>
							<TextInput
								value={query}
								onChangeText={setQuery}
								placeholder="Search movements"
								placeholderTextColor={theme.textSecondary}
								style={[styles.searchInput, { color: theme.text }]}
								autoCorrect={false}
								autoCapitalize="none"
								clearButtonMode="while-editing"
							/>
						</ThemedView>

						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={styles.chips}>
							{([ALL, ...groups] as Filter[]).map((group) => {
								const selected = filter === group;
								return (
									<Pressable
										key={group}
										onPress={() => setFilter(group)}
										style={[styles.chip, chipStyle(selected)]}>
										<ThemedText type="small" style={chipTextStyle(selected)}>
											{group}
										</ThemedText>
									</Pressable>
								);
							})}
						</ScrollView>

						<Pressable style={styles.toggleRow} onPress={() => setShowArchived((v) => !v)}>
							<ThemedView
								type="backgroundSelected"
								style={[styles.toggleTrack, showArchived && { backgroundColor: theme.text }]}>
								<ThemedView
									style={[
										styles.toggleThumb,
										showArchived && { backgroundColor: theme.background, alignSelf: 'flex-end' },
									]}
								/>
							</ThemedView>
							<ThemedText type="small" themeColor="textSecondary">
								Show archived
							</ThemedText>
						</Pressable>
					</ThemedView>
				}
				ListEmptyComponent={
					empty ? (
						<ThemedView type="backgroundElement" style={styles.empty}>
							<ThemedText themeColor="textSecondary">No movements match</ThemedText>
						</ThemedView>
					) : null
				}
				renderItem={({ item }) => <MovementRow movement={item} muted={item.archived} />}
			/>
		</ThemedView>
	);
}

function MovementRow({ movement, muted }: { movement: CatalogMovement; muted: boolean }) {
	return (
		<ThemedView
			type="backgroundElement"
			style={[styles.row, muted && styles.rowMuted]}>
			<ThemedText type="default">{movement.name}</ThemedText>
			<ThemedView style={[styles.tag, muted && styles.tagMuted]}>
				<ThemedText type="small" themeColor={muted ? 'textSecondary' : 'text'} style={styles.tagText}>
					{movement.muscleGroup}
				</ThemedText>
			</ThemedView>
			{muted && (
				<ThemedText type="small" themeColor="textSecondary" style={styles.archivedTag}>
					Archived
				</ThemedText>
			)}
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
	},
	list: {
		flex: 1,
		width: '100%',
		maxWidth: MaxContentWidth,
	},
	content: {
		gap: Spacing.three,
	},
	header: {
		gap: Spacing.three,
		marginBottom: Spacing.two,
	},
	title: {
		fontSize: 40,
		lineHeight: 44,
	},
	searchBox: {
		borderRadius: Spacing.three,
		paddingHorizontal: Spacing.three,
	},
	searchInput: {
		height: 44,
		fontSize: 16,
	},
	chips: {
		flexDirection: 'row',
		gap: Spacing.two,
		paddingVertical: Spacing.one,
	},
	chip: {
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.two,
		borderRadius: Spacing.five,
	},
	toggleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.two,
	},
	toggleTrack: {
		width: 44,
		height: 26,
		borderRadius: 13,
		justifyContent: 'center',
		padding: 3,
	},
	toggleThumb: {
		width: 20,
		height: 20,
		borderRadius: 10,
		alignSelf: 'flex-start',
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.two,
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.three,
		borderRadius: Spacing.three,
		marginBottom: Spacing.two,
	},
	rowMuted: {
		opacity: 0.55,
	},
	tag: {
		paddingHorizontal: Spacing.two,
		paddingVertical: Spacing.half,
		borderRadius: Spacing.three,
		backgroundColor: 'transparent',
	},
	tagMuted: {
		opacity: 0.7,
	},
	tagText: {
		fontWeight: 600,
	},
	archivedTag: {
		marginLeft: 'auto',
		fontWeight: 600,
		textTransform: 'uppercase',
	},
	empty: {
		paddingVertical: Spacing.five,
		borderRadius: Spacing.three,
		alignItems: 'center',
	},
});
