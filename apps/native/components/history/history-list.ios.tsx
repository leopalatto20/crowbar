import { HStack, Host, List, Section, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  contentShape,
  font,
  foregroundStyle,
  onTapGesture,
  shapes,
} from "@expo/ui/swift-ui/modifiers";

import { useI18n } from "@/lib/i18n";
import { type } from "@/lib/theme";

import type { HistoryListProps } from "./history-list.types";
import { historyRow } from "./history-row";

export function HistoryList({ months, onOpen }: HistoryListProps) {
  const i18n = useI18n();
  return (
    <Host style={{ flex: 1 }}>
      <List>
        {months.map(({ year, month, workouts }) => (
          <Section key={`${year}-${month}`} title={i18n.formatMonth(year, month)}>
            {workouts.map((workout) => {
              const { title, subtitle } = historyRow(workout, i18n);
              return (
                <HStack
                  key={workout.id}
                  modifiers={[
                    contentShape(shapes.rectangle()),
                    onTapGesture(() => onOpen(workout.id)),
                  ]}
                >
                  <VStack alignment="leading" spacing={2}>
                    <Text>{title}</Text>
                    <Text
                      modifiers={[
                        font({ size: type.footnote.fontSize }),
                        foregroundStyle({ type: "hierarchical", style: "secondary" }),
                      ]}
                    >
                      {subtitle}
                    </Text>
                  </VStack>
                  <Spacer />
                </HStack>
              );
            })}
          </Section>
        ))}
      </List>
    </Host>
  );
}
