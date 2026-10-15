import { Share } from "react-native";

// React Native's share sheet reports whether the lifter finished sharing or dismissed it;
// expo-sharing resolves the same either way.
export async function shareFile(uri: string) {
  const { action } = await Share.share({ url: uri });
  return action === Share.sharedAction;
}
