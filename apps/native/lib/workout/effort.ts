import { useSettings } from "@/lib/settings";

export const useEffort = () => useSettings().effortScale;
