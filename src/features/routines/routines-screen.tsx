import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import {
	createRoutine,
	getDb,
	listMovements,
	listRoutines,
	type CatalogMovement,
	type RoutineSummary,
} from "@/db";

import { MovementPickerModal } from "./movement-picker-modal";

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
		if (view !== "builder") return;
		let cancelled = false;
		Promise.resolve()
			.then(() => {
				if (cancelled) return undefined;
				setMovementsLoading(true);
				setMovementsError(null);
				return listMovements(getDb());
			})
			.then((movements) => {
				if (!cancelled && movements) setMovementOptions(movements);
			})
			.catch((loadError) => {
				if (!cancelled) {
					setMovementsError(errorMessage(loadError, "Unable to load active Movements."));
				}
			})
			.finally(() => {
				if (!cancelled) setMovementsLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [view]);

	const openBuilder = () => {
		setError(null);
		setView("builder");
	};

	if (view === "builder") {
		return (
			<RoutineBuilder
				movementOptions={movementOptions}
				movementsLoading={movementsLoading}
				movementsError={movementsError}
				onCancel={() => setView("list")}
				onSaved={() => {
					setView("list");
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
							<Text size="5xl" bold>
								Routines
							</Text>
							{!empty && (
								<Button onPress={openBuilder} accessibilityLabel="Create routine">
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
					loading ? (
						<Box className="items-center gap-2 rounded-xl bg-card px-4 py-8">
							<ActivityIndicator accessibilityLabel="Loading routines" />
							<Text className="text-muted-foreground">Loading Routines…</Text>
						</Box>
					) : empty && !error ? (
						<Box className="items-center gap-4 rounded-xl bg-card px-4 py-8">
							<Box className="items-center gap-2">
								<Text size="xl" bold>
									No Routines yet
								</Text>
								<Text className="text-center text-muted-foreground">
									Build a simple ledger for your next session.
								</Text>
							</Box>
							<Button onPress={openBuilder} accessibilityLabel="Create routine">
								<ButtonText>Create routine</ButtonText>
							</Button>
						</Box>
					) : null
				}
				renderItem={({ item }) => (
					<Box className="flex-row items-center justify-between rounded-xl bg-card px-4 py-4">
						<Text size="lg" bold className="min-w-0 flex-1">
							{item.name}
						</Text>
						<Text size="sm" className="text-muted-foreground">
							{movementCountLabel(item.movementCount)}
						</Text>
					</Box>
				)}
			/>
		</SafeAreaView>
	);
}

type RoutineBuilderProps = {
	movementOptions: CatalogMovement[];
	movementsLoading: boolean;
	movementsError: string | null;
	onCancel: () => void;
	onSaved: () => void;
};

function RoutineBuilder({
	movementOptions,
	movementsLoading,
	movementsError,
	onCancel,
	onSaved,
}: RoutineBuilderProps) {
	const [name, setName] = useState("");
	const [movementIds, setMovementIds] = useState<number[]>([]);
	const [pickerVisible, setPickerVisible] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const selectedMovements = movementIds
		.map((id) => movementOptions.find((movement) => movement.id === id))
		.filter((movement): movement is CatalogMovement => movement !== undefined);
	const canSave = name.trim().length > 0 && selectedMovements.length > 0 && !saving;

	const addMovement = (movement: CatalogMovement) => {
		setMovementIds((ids) => (ids.includes(movement.id) ? ids : [...ids, movement.id]));
		setPickerVisible(false);
	};

	const removeMovement = (movementId: number) => {
		setMovementIds((ids) => ids.filter((id) => id !== movementId));
	};

	const save = async () => {
		if (!canSave) return;
		setSaving(true);
		setError(null);
		try {
			await createRoutine(getDb(), { name, movementIds });
			onSaved();
		} catch (saveError) {
			setError(errorMessage(saveError, "Unable to save Routine."));
		} finally {
			setSaving(false);
		}
	};

	return (
		<SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right", "bottom"]}>
			<ScrollView contentContainerClassName="mx-auto w-full max-w-[800px] gap-4 px-4 pb-28 pt-4" keyboardShouldPersistTaps="handled">
				<Box className="flex-row items-center justify-between">
					<Button variant="ghost" onPress={onCancel} accessibilityLabel="Back to routines">
						<ButtonText>Back</ButtonText>
					</Button>
					<Text size="2xl" bold>
						New Routine
					</Text>
					<Box className="w-16" />
				</Box>

				<Box className="gap-2">
					<Text size="sm" bold>
						Routine name
					</Text>
					<Input>
						<InputField
							value={name}
							onChangeText={setName}
							placeholder="e.g. Upper body"
							accessibilityLabel="Routine name"
							autoCapitalize="sentences"
						/>
					</Input>
				</Box>

				<Box className="gap-4 rounded-xl bg-card p-4">
					<Box className="flex-row items-center justify-between">
						<Text size="lg" bold>
							Ledger
						</Text>
						<Text size="sm" className="text-muted-foreground">
							{movementCountLabel(selectedMovements.length)}
						</Text>
					</Box>
					{selectedMovements.length === 0 ? (
						<Text className="py-4 text-muted-foreground">No Movements added yet.</Text>
					) : (
						selectedMovements.map((movement, index) => (
							<Box key={movement.id} className="flex-row items-center gap-2 border-t border-border py-2">
								<Text size="sm" className="w-6 text-muted-foreground">
									{index + 1}
								</Text>
								<Text className="min-w-0 flex-1">{movement.name}</Text>
								<Button
									variant="ghost"
									onPress={() => removeMovement(movement.id)}
									accessibilityLabel={`Remove ${movement.name}`}
								>
									<ButtonText>Remove</ButtonText>
								</Button>
							</Box>
						))
					)}
				</Box>

				<Button
					variant="outline"
					onPress={() => setPickerVisible(true)}
					disabled={movementsLoading || movementOptions.length === 0}
					accessibilityLabel="Add movement to routine"
				>
					<ButtonText>{movementsLoading ? "Loading movements…" : "Add movement"}</ButtonText>
				</Button>
				{movementsError && <Text className="text-destructive">{movementsError}</Text>}
				{error && (
					<Box className="rounded-xl bg-muted px-4 py-2" accessibilityRole="alert">
						<Text className="text-destructive">{error}</Text>
					</Box>
				)}
				<Button onPress={() => void save()} disabled={!canSave} accessibilityLabel="Save routine">
					<ButtonText>{saving ? "Saving…" : "Save routine"}</ButtonText>
				</Button>
			</ScrollView>
			<MovementPickerModal
				visible={pickerVisible}
				options={movementOptions}
				selectedIds={movementIds}
				onClose={() => setPickerVisible(false)}
				onSelect={addMovement}
			/>
		</SafeAreaView>
	);
}

function errorMessage(error: unknown, fallback: string): string {
	return error instanceof Error ? error.message : fallback;
}

function movementCountLabel(count: number): string {
	return `${count} ${count === 1 ? "Movement" : "Movements"}`;
}
