import { useMemo, useState } from 'react';
import {
	FlatList,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';

type MuscleGroupPickerModalProps = {
	visible: boolean;
	options: readonly string[];
	selected: string;
	onClose: () => void;
	onSelect: (option: string) => void;
};

export function MuscleGroupPickerModal({
	visible,
	options,
	selected,
	onClose,
	onSelect,
}: MuscleGroupPickerModalProps) {
	const [query, setQuery] = useState('');
	const normalizedQuery = query.trim().toLowerCase();
	const filteredOptions = useMemo(
		() => options.filter((option) => option.toLowerCase().includes(normalizedQuery)),
		[normalizedQuery, options],
	);

	return (
		<Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				className="flex-1 justify-end"
			>
				<Pressable className="absolute inset-0 bg-background/50" onPress={onClose} />
				<SafeAreaView
					className="flex-1 justify-end"
					edges={['bottom']}
					pointerEvents="box-none"
				>
					<Box className="h-[86%] rounded-t-xl bg-background px-4 pb-4 pt-4 web:max-w-[800px] web:w-full web:mx-auto">
						<Box className="min-h-0 flex-1 gap-4">
							<Box className="flex-row items-center justify-between">
								<Box className="gap-1">
									<Text size="2xl" className="font-semibold">Muscle group</Text>
									<Text size="sm" className="text-muted-foreground">Choose one group to narrow the catalog.</Text>
								</Box>
								<Button variant="ghost" size="sm" onPress={onClose} accessibilityLabel="Close muscle group picker">
									<ButtonText>Close</ButtonText>
								</Button>
							</Box>

							<Input className="rounded-xl border-0 bg-card">
								<InputField
									value={query}
									onChangeText={setQuery}
									placeholder="Search muscle groups"
									accessibilityLabel="Search muscle groups"
									autoCorrect={false}
									autoCapitalize="none"
									clearButtonMode="while-editing"
									autoFocus
								/>
							</Input>

							<FlatList
								className="min-h-0 flex-1"
								data={filteredOptions}
								keyExtractor={(option) => option}
								keyboardShouldPersistTaps="handled"
								contentContainerClassName="gap-2 pb-2"
								ListEmptyComponent={
									<Box className="items-center rounded-xl bg-card px-4 py-8">
										<Text className="text-muted-foreground">No muscle groups match</Text>
									</Box>
								}
								renderItem={({ item }) => {
									const isSelected = item === selected;
									return (
										<Button
											variant={isSelected ? 'default' : 'outline'}
											className="w-full justify-start"
											onPress={() => onSelect(item)}
											accessibilityRole="radio"
											accessibilityState={{ selected: isSelected }}
										>
											<ButtonText>{item}</ButtonText>
										</Button>
									);
								}}
							/>
						</Box>
					</Box>
				</SafeAreaView>
			</KeyboardAvoidingView>
		</Modal>
	);
}
