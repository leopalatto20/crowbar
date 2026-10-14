import { TabStack } from "@/components/tab-stack";

// Without it the tab would open on its alphabetically first screen, Gyms.
export const unstable_settings = {
  initialRouteName: "settings",
};

export default TabStack;
