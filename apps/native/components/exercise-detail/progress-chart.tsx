import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import {
  Circle,
  Group,
  Line as SkiaLine,
  type SkFont,
  Text as SkiaText,
  useFont,
  vec,
} from "@shopify/react-native-skia";
import { Text, View, useWindowDimensions } from "react-native";
import { type SharedValue, useAnimatedReaction, useDerivedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
  CartesianChart,
  Line,
  type PointsArray,
  Scatter,
  useChartPressState,
} from "victory-native";

import type { ChartMeasure, ChartSeries } from "@/db/progress";
import { haptics } from "@/lib/haptics";
import { type I18n, useI18n } from "@/lib/i18n";
import { spacing, type, useColors } from "@/lib/theme";
import type { LoadFormat } from "@/lib/workout/model";

const PLOT_HEIGHT = 180;
// Past this, the readout would crowd the plot off a phone-sized card.
const MAX_FONT_SCALE = 1.35;
// Closer than this, set counts under neighbouring points would run into each other.
const MIN_SET_COUNT_GAP = 24;

export function ProgressChart({ chart, format }: { chart: ChartSeries; format: LoadFormat }) {
  const p = useColors();
  const i18n = useI18n();
  const { fontScale } = useWindowDimensions();
  // Skia draws text from a typeface it loads itself, not the system font, so it ships with the
  // app; sizes follow the type ramp and Dynamic Type like the rest of the screen.
  const scale = Math.min(fontScale, MAX_FONT_SCALE);
  const valueSize = type.headline.fontSize * scale;
  const detailSize = type.footnote.fontSize * scale;
  const axisSize = type.caption.fontSize * scale;
  const valueFont = useFont(Inter_600SemiBold, valueSize);
  const detailFont = useFont(Inter_400Regular, detailSize);
  const axisFont = useFont(Inter_400Regular, axisSize);
  const { state } = useChartPressState({ x: 0, y: { total: 0 } });

  const { points } = chart;
  const measure = describeMeasure(chart.measure, format, i18n);
  const data = points.map(({ value }, index) => ({ index, total: value }));
  // Formatted on the JS thread, so the scrub only has to pick one by index on the UI thread.
  const readouts = points.map(({ value, startedAt, timeZone, sets }) => ({
    value: measure.format(value),
    detail: `${i18n.formatDate(startedAt, timeZone)} · ${i18n.t.exerciseDetail.chartSets(sets)}`,
  }));
  const latest = points.length - 1;

  const shown = useDerivedValue(() =>
    state.isActive.value && state.matchedIndex.value >= 0 ? state.matchedIndex.value : latest,
  );
  const valueText = useDerivedValue(() => readouts[shown.value]?.value ?? "");
  const detailText = useDerivedValue(() => readouts[shown.value]?.detail ?? "");
  useAnimatedReaction(
    () => (state.isActive.value ? state.matchedIndex.value : -1),
    (index, previous) => {
      if (index >= 0 && previous !== null && previous >= 0 && index !== previous) {
        scheduleOnRN(haptics.selection);
      }
    },
  );

  const valueBaseline = Math.round(valueSize * 1.1);
  const detailBaseline = valueBaseline + Math.round(detailSize * 1.45);
  // The top tick label centres on the plot's top edge, so the readout keeps clear of half of it.
  const readoutHeight = detailBaseline + spacing.xl + axisSize / 2;
  const setCountHeight = axisSize + spacing.md;

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ color: p.secondary, ...type.footnote, fontWeight: "600" }}>
        {measure.title}
      </Text>
      <View
        style={{ height: readoutHeight + PLOT_HEIGHT + setCountHeight }}
        accessible
        accessibilityLabel={i18n.t.exerciseDetail.chartSummary(
          readouts[latest]!.value,
          readouts[latest]!.detail,
        )}
      >
        <CartesianChart
          data={data}
          xKey="index"
          yKeys={["total"]}
          // A lone Workout sits in the middle rather than against the axis.
          domain={{ x: points.length === 1 ? [-1, 1] : [0, latest] }}
          domainPadding={{ left: 12, right: 12, top: 12, bottom: 12 }}
          padding={{ top: readoutHeight, bottom: setCountHeight }}
          chartPressState={state}
          xAxis={{ lineWidth: 0, tickValues: [] }}
          yAxis={[
            {
              font: measure.labelledScale ? axisFont : null,
              tickCount: 4,
              lineColor: p.separator,
              labelColor: p.secondary,
              formatYLabel: (value) => i18n.formatDecimal(value),
            },
          ]}
          frame={{ lineWidth: 0 }}
          renderOutside={({ points: plotted, chartBounds }) => (
            <>
              {valueFont && (
                <SkiaText
                  x={0}
                  y={valueBaseline}
                  text={valueText}
                  font={valueFont}
                  color={p.label}
                />
              )}
              {detailFont && (
                <SkiaText
                  x={0}
                  y={detailBaseline}
                  text={detailText}
                  font={detailFont}
                  color={p.secondary}
                />
              )}
              {axisFont && (
                <SetCounts
                  points={plotted.total}
                  sets={points.map(({ sets }) => sets)}
                  y={chartBounds.bottom + axisSize + spacing.xs}
                  font={axisFont}
                  color={p.secondary}
                />
              )}
            </>
          )}
        >
          {({ points: plotted, chartBounds }) => (
            <>
              <Line points={plotted.total} color={p.blue} strokeWidth={2} curveType="linear" />
              <Scatter points={plotted.total} radius={3.5} color={p.blue} />
              <ScrubIndicator
                x={state.x.position}
                y={state.y.total.position}
                active={state.isActive}
                top={chartBounds.top}
                bottom={chartBounds.bottom}
                color={p.blue}
                lineColor={p.tertiary}
              />
            </>
          )}
        </CartesianChart>
      </View>
    </View>
  );
}

function describeMeasure(measure: ChartMeasure, format: LoadFormat, i18n: I18n) {
  const { t } = i18n;
  const amount = (value: number) => i18n.formatDecimal(value);
  switch (measure) {
    case "volume":
      return {
        title: t.exerciseDetail.chartTitle.volume(t.unit[format.unit]),
        format: (value: number) => `${amount(value)} ${t.unit[format.unit]}`,
        labelledScale: true,
      };
    case "levelReps":
      return {
        title: t.exerciseDetail.chartTitle.levelReps,
        format: amount,
        // Stack levels only compare to themselves, so level × reps has no scale worth reading.
        labelledScale: false,
      };
    case "reps":
      return {
        title: t.exerciseDetail.chartTitle.reps,
        format: (value: number) => t.exerciseDetail.chartReps(amount(value), format.unilateral),
        labelledScale: true,
      };
  }
}

// Thinned from the newest point back when the Workouts get too dense to label each one.
function SetCounts({
  points,
  sets,
  y,
  font,
  color,
}: {
  points: PointsArray;
  sets: number[];
  y: number;
  font: SkFont;
  color: string;
}) {
  const gap = points.length > 1 ? points[1]!.x - points[0]!.x : Infinity;
  const stride = Math.max(1, Math.ceil(MIN_SET_COUNT_GAP / gap));
  const latest = points.length - 1;
  return points.map((point, index) => {
    if ((latest - index) % stride !== 0) return null;
    const text = String(sets[index]);
    return (
      <SkiaText
        key={index}
        x={point.x - font.measureText(text).width / 2}
        y={y}
        text={text}
        font={font}
        color={color}
      />
    );
  });
}

function ScrubIndicator({
  x,
  y,
  active,
  top,
  bottom,
  color,
  lineColor,
}: {
  x: SharedValue<number>;
  y: SharedValue<number>;
  active: SharedValue<boolean>;
  top: number;
  bottom: number;
  color: string;
  lineColor: string;
}) {
  const opacity = useDerivedValue(() => (active.value ? 1 : 0));
  const from = useDerivedValue(() => vec(x.value, top));
  const to = useDerivedValue(() => vec(x.value, bottom));
  return (
    <Group opacity={opacity}>
      <SkiaLine p1={from} p2={to} color={lineColor} strokeWidth={1} />
      <Circle cx={x} cy={y} r={6} color={color} />
    </Group>
  );
}
