import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
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
import { Text, View } from "react-native";
import { type SharedValue, useAnimatedReaction, useDerivedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
  CartesianChart,
  Line,
  type PointsArray,
  Scatter,
  useChartPressState,
} from "victory-native";

import type { ChartMeasure, ProgressChart as Chart } from "@/db/progress";
import { haptics } from "@/lib/haptics";
import { type I18n, useI18n } from "@/lib/i18n";
import { spacing, type, useColors } from "@/lib/theme";
import type { LoadFormat } from "@/lib/workout/model";

const HEIGHT = 240;
// Leaves room for the top tick label, which centres on the plot's top edge.
const READOUT_HEIGHT = 64;
const SET_COUNT_HEIGHT = 20;
// Closer than this, set counts under neighbouring points would run into each other.
const MIN_SET_COUNT_GAP = 24;

export function ProgressChart({ chart, format }: { chart: Chart; format: LoadFormat }) {
  const p = useColors();
  const i18n = useI18n();
  const { t } = i18n;
  const axisFont = useFont(Inter_500Medium, 11);
  const valueFont = useFont(Inter_600SemiBold, 20);
  const detailFont = useFont(Inter_500Medium, 13);
  const { state } = useChartPressState({ x: 0, y: { total: 0 } });

  const { measure, points } = chart;
  const data = points.map(({ value }, index) => ({ index, total: value }));
  // Formatted on the JS thread, so the scrub only has to pick one by index on the UI thread.
  const values = points.map(({ value }) => formatValue(value, measure, format, i18n));
  const details = points.map(
    ({ startedAt, timeZone, sets }) =>
      `${i18n.formatDate(startedAt, timeZone)} · ${t.exerciseDetail.chartSets(sets)}`,
  );
  const latest = points.length - 1;
  const latestPoint = points[latest]!;

  const shown = useDerivedValue(() =>
    state.isActive.value && state.matchedIndex.value >= 0 ? state.matchedIndex.value : latest,
  );
  const valueText = useDerivedValue(() => values[shown.value] ?? "");
  const detailText = useDerivedValue(() => details[shown.value] ?? "");
  useAnimatedReaction(
    () => (state.isActive.value ? state.matchedIndex.value : -1),
    (index, previous) => {
      if (index >= 0 && previous !== null && previous >= 0 && index !== previous) {
        scheduleOnRN(haptics.selection);
      }
    },
  );

  const title =
    measure === "volume"
      ? t.exerciseDetail.chartTitle.volume(t.unit[format.unit])
      : t.exerciseDetail.chartTitle[measure];

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ color: p.secondary, ...type.footnote, fontWeight: "600" }}>{title}</Text>
      <View
        style={{ height: HEIGHT }}
        accessible
        accessibilityLabel={t.exerciseDetail.chartSummary(
          values[latest]!,
          i18n.formatDate(latestPoint.startedAt, latestPoint.timeZone),
          t.exerciseDetail.chartSets(latestPoint.sets),
        )}
      >
        <CartesianChart
          data={data}
          xKey="index"
          yKeys={["total"]}
          // A lone Workout sits in the middle rather than against the axis.
          domain={{ x: points.length === 1 ? [-1, 1] : [0, latest] }}
          domainPadding={{ left: 12, right: 12, top: 12, bottom: 12 }}
          padding={{ top: READOUT_HEIGHT, bottom: SET_COUNT_HEIGHT }}
          chartPressState={state}
          xAxis={{ lineWidth: 0, tickValues: [] }}
          yAxis={[
            {
              // Stack levels only compare to themselves, so level × reps has no scale worth reading.
              font: measure === "levelReps" ? null : axisFont,
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
                <SkiaText x={0} y={22} text={valueText} font={valueFont} color={p.label} />
              )}
              {detailFont && (
                <SkiaText x={0} y={40} text={detailText} font={detailFont} color={p.secondary} />
              )}
              {axisFont && (
                <SetCounts
                  points={plotted.total}
                  sets={points.map(({ sets }) => sets)}
                  y={chartBounds.bottom + 15}
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

function formatValue(value: number, measure: ChartMeasure, format: LoadFormat, i18n: I18n) {
  const amount = i18n.formatDecimal(value);
  if (measure === "volume") return `${amount} ${i18n.t.unit[format.unit]}`;
  if (measure === "levelReps") return amount;
  return format.unilateral ? i18n.t.load.perSide(amount) : i18n.t.exerciseDetail.chartReps(amount);
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
