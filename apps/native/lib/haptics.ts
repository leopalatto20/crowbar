import * as Haptics from "expo-haptics";

const ios = process.env.EXPO_OS === "ios";

export const haptics = {
  selection() {
    if (ios) void Haptics.selectionAsync();
  },
  light() {
    if (ios) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  // The phone is usually face-up on a bench between sets, so the end of rest is felt, not watched.
  restOver() {
    if (ios) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },
};
