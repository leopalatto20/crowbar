import { TabStack } from "@/components/tab-stack";

// Without it the tab would open on its alphabetically first screen, Exercise detail.
export const unstable_settings = {
  initialRouteName: "exercises",
};

export default TabStack;
