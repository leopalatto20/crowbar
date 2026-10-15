import {
  DatePickerDialog,
  DropdownMenu,
  DropdownMenuItem,
  Host,
  Row,
  Text,
  TimePickerDialog,
} from "@expo/ui/jetpack-compose";
import { clickable } from "@expo/ui/jetpack-compose/modifiers";
import { useCalendars } from "expo-localization";
import { useState } from "react";

import { useI18n } from "@/lib/i18n";
import { type, useColors } from "@/lib/theme";
import { durationMinutes, durationOptions, formatDuration } from "@/lib/workout/model";
import {
  type WallClock,
  pickerDateOf,
  wallClockOf,
  wallClockOfPickerDate,
} from "@/lib/workout/time";

import type { WorkoutTimesProps } from "./workout-times.types";

// Material's date picker counts whole days in UTC, so a day travels as UTC midnight.
function utcDayOf({ year, month, day }: WallClock) {
  return new Date(Date.UTC(year, month - 1, day));
}

// The date first, then the time on that date: Material has no picker for both at once.
export function WorkoutTimes(props: WorkoutTimesProps) {
  const { startedAt, timeZone, onChangeStart, onChangeDuration } = props;
  const p = useColors();
  const i18n = useI18n();
  const { t } = i18n;
  const [calendar] = useCalendars();
  const [picking, setPicking] = useState<"date" | WallClock | null>(null);
  const [durationExpanded, setDurationExpanded] = useState(false);
  const start = wallClockOf(startedAt, timeZone);
  const minutes = durationMinutes(props.startedAt, props.finishedAt);
  const textStyle = { fontSize: type.footnote.fontSize };

  return (
    <Host matchContents style={{ alignSelf: "flex-start" }}>
      <Row horizontalArrangement={{ spacedBy: 12 }}>
        <Text color={p.blue} style={textStyle} modifiers={[clickable(() => setPicking("date"))]}>
          {t.history.started(
            i18n.formatDate(startedAt, timeZone),
            i18n.formatTime(startedAt, timeZone),
          )}
        </Text>
        <DropdownMenu
          expanded={durationExpanded}
          onDismissRequest={() => setDurationExpanded(false)}
        >
          <DropdownMenu.Trigger>
            <Text
              color={p.blue}
              style={textStyle}
              modifiers={[clickable(() => setDurationExpanded(true))]}
            >
              {`${t.history.duration} ${formatDuration(minutes)} ▾`}
            </Text>
          </DropdownMenu.Trigger>
          <DropdownMenu.Items>
            {durationOptions(minutes).map((option) => (
              <DropdownMenuItem
                key={option}
                onClick={() => {
                  setDurationExpanded(false);
                  onChangeDuration(option);
                }}
              >
                <DropdownMenuItem.Text>
                  <Text style={{ fontWeight: option === minutes ? "700" : "400" }}>
                    {formatDuration(option)}
                  </Text>
                </DropdownMenuItem.Text>
              </DropdownMenuItem>
            ))}
          </DropdownMenu.Items>
        </DropdownMenu>
      </Row>
      {picking === "date" && (
        <DatePickerDialog
          initialDate={utcDayOf(start).toISOString()}
          selectableDates={{ end: utcDayOf(wallClockOf(Date.now(), timeZone)) }}
          onDateSelected={(date) =>
            setPicking({
              ...start,
              year: date.getUTCFullYear(),
              month: date.getUTCMonth() + 1,
              day: date.getUTCDate(),
            })
          }
          onDismissRequest={() => setPicking(null)}
        />
      )}
      {picking !== null && picking !== "date" && (
        <TimePickerDialog
          initialDate={pickerDateOf(picking).toISOString()}
          is24Hour={calendar?.uses24hourClock ?? false}
          onDateSelected={(date) => {
            const { hour, minute } = wallClockOfPickerDate(date);
            setPicking(null);
            onChangeStart({ ...picking, hour, minute });
          }}
          onDismissRequest={() => setPicking(null)}
        />
      )}
    </Host>
  );
}
