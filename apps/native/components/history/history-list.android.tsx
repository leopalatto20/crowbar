import { Host, LazyColumn, ListItem, Text } from "@expo/ui/jetpack-compose";
import { clickable, padding } from "@expo/ui/jetpack-compose/modifiers";

import { useI18n } from "@/lib/i18n";
import { useColors } from "@/lib/theme";

import type { HistoryListProps } from "./history-list.types";
import { historyRow } from "./history-row";

export function HistoryList({ months, onOpen }: HistoryListProps) {
  const p = useColors();
  const i18n = useI18n();
  return (
    <Host style={{ flex: 1 }}>
      <LazyColumn>
        {months.flatMap(({ year, month, workouts }) => [
          <Text
            key={`${year}-${month}`}
            color={p.secondary}
            style={{ typography: "labelLarge" }}
            modifiers={[padding(16, 16, 16, 8)]}
          >
            {i18n.formatMonth(year, month)}
          </Text>,
          ...workouts.map((workout) => {
            const { title, subtitle } = historyRow(workout, i18n);
            return (
              <ListItem key={workout.id} modifiers={[clickable(() => onOpen(workout.id))]}>
                <ListItem.HeadlineContent>
                  <Text>{title}</Text>
                </ListItem.HeadlineContent>
                <ListItem.SupportingContent>
                  <Text color={p.secondary}>{subtitle}</Text>
                </ListItem.SupportingContent>
              </ListItem>
            );
          }),
        ])}
      </LazyColumn>
    </Host>
  );
}
