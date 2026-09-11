import type { ReactElement, ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  type ListRenderItem,
  type ScrollViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';

type EntityListScreenProps<Item> = {
  readonly data: Item[];
  readonly header: ReactNode;
  readonly emptyState: ReactElement | null;
  readonly keyExtractor: (item: Item, index: number) => string;
  readonly renderItem: ListRenderItem<Item>;
  readonly loaded: boolean;
  readonly loading: boolean;
  readonly refreshing: boolean;
  readonly loadError: string | null;
  readonly loadingLabel: string;
  readonly loadingAccessibilityLabel: string;
  readonly refreshingLabel: string;
  readonly refreshingAccessibilityLabel: string;
  readonly staleDataMessage: string;
  readonly retryAccessibilityLabel: string;
  readonly onRetry: () => void;
  readonly keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
  readonly children?: ReactNode;
};

export function EntityListScreen<Item>({
  data,
  header,
  emptyState,
  keyExtractor,
  renderItem,
  loaded,
  loading,
  refreshing,
  loadError,
  loadingLabel,
  loadingAccessibilityLabel,
  refreshingLabel,
  refreshingAccessibilityLabel,
  staleDataMessage,
  retryAccessibilityLabel,
  onRetry,
  keyboardShouldPersistTaps,
  children,
}: EntityListScreenProps<Item>) {
  const empty = loaded && data.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right', 'bottom']}>
      <FlatList
        className="w-full web:mx-auto web:max-w-[800px]"
        contentContainerClassName="gap-4 px-4 pb-28 pt-4"
        data={data}
        keyExtractor={keyExtractor}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        ListHeaderComponent={
          <Box className="gap-4">
            {header}
            {refreshing && (
              <Box
                className="flex-row items-center gap-2 rounded-xl bg-muted px-4 py-3"
                accessibilityLiveRegion="polite"
              >
                <ActivityIndicator size="small" accessibilityLabel={refreshingAccessibilityLabel} />
                <Text className="text-muted-foreground">{refreshingLabel}</Text>
              </Box>
            )}
            {loadError && (
              <Box className="gap-3 rounded-xl bg-muted px-4 py-4" accessibilityRole="alert">
                <Text className="text-destructive">{loadError}</Text>
                {loaded && <Text className="text-muted-foreground">{staleDataMessage}</Text>}
                <Button
                  variant="outline"
                  size="sm"
                  onPress={onRetry}
                  disabled={loading || refreshing}
                  accessibilityLabel={retryAccessibilityLabel}
                >
                  <ButtonText>Try again</ButtonText>
                </Button>
              </Box>
            )}
          </Box>
        }
        ListEmptyComponent={
          loading || refreshing ? (
            <Box className="items-center gap-3 rounded-xl bg-card px-4 py-8">
              <ActivityIndicator
                accessibilityLabel={
                  refreshing ? refreshingAccessibilityLabel : loadingAccessibilityLabel
                }
              />
              <Text className="text-muted-foreground">
                {refreshing ? refreshingLabel : loadingLabel}
              </Text>
            </Box>
          ) : empty && !loadError ? (
            emptyState
          ) : null
        }
        renderItem={renderItem}
      />
      {children}
    </SafeAreaView>
  );
}

type EntityListTitleProps = {
  readonly children: ReactNode;
  readonly action?: ReactNode;
};

export function EntityListTitle({ children, action }: EntityListTitleProps) {
  return (
    <Box className="flex-row items-center justify-between">
      <Text size="5xl" bold>
        {children}
      </Text>
      {action}
    </Box>
  );
}

type ArchiveVisibilityToggleProps = {
  readonly value: boolean;
  readonly onValueChange: (value: boolean) => void;
  readonly trailingAction?: ReactNode;
};

export function ArchiveVisibilityToggle({
  value,
  onValueChange,
  trailingAction,
}: ArchiveVisibilityToggleProps) {
  return (
    <Box className="min-h-9 flex-row items-center justify-between gap-3">
      <Box className="flex-row items-center gap-2">
        <Switch value={value} onValueChange={onValueChange} accessibilityLabel="Show archived" />
        <Text size="sm" className="text-muted-foreground">
          Show archived
        </Text>
      </Box>
      {trailingAction}
    </Box>
  );
}
