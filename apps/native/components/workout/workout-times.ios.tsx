import { DatePicker, HStack, Host, Image, Menu, Picker, Text } from "@expo/ui/swift-ui";
import { font, labelsHidden, pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";

import { useI18n } from "@/lib/i18n";
import { type, useColors } from "@/lib/theme";
import { durationMinutes, durationOptions, formatDuration } from "@/lib/workout/model";
import { pickerDateOf, wallClockOf, wallClockOfPickerDate } from "@/lib/workout/time";

import type { WorkoutTimesProps } from "./workout-times.types";

export function WorkoutTimes(props: WorkoutTimesProps) {
  const { startedAt, timeZone, onChangeStart, onChangeDuration } = props;
  const p = useColors();
  const { t } = useI18n();
  const minutes = durationMinutes(props.startedAt, props.finishedAt);
  return (
    <Host matchContents style={{ alignSelf: "flex-start" }}>
      <HStack spacing={12}>
        <DatePicker
          title={t.history.start}
          selection={pickerDateOf(wallClockOf(startedAt, timeZone))}
          range={{ end: pickerDateOf(wallClockOf(Date.now(), timeZone)) }}
          displayedComponents={["date", "hourAndMinute"]}
          onDateChange={(date) => onChangeStart(wallClockOfPickerDate(date))}
          modifiers={[labelsHidden()]}
        />
        <Menu
          label={
            <HStack spacing={3}>
              <Text modifiers={[font({ size: type.footnote.fontSize })]}>
                {`${t.history.duration} ${formatDuration(minutes)}`}
              </Text>
              <Image systemName="chevron.down" size={10} color={p.blue} />
            </HStack>
          }
        >
          <Picker
            selection={minutes}
            onSelectionChange={(value: number) => onChangeDuration(value)}
            modifiers={[pickerStyle("inline")]}
          >
            {durationOptions(minutes).map((option) => (
              <Text key={option} modifiers={[tag(option)]}>
                {formatDuration(option)}
              </Text>
            ))}
          </Picker>
        </Menu>
      </HStack>
    </Host>
  );
}
