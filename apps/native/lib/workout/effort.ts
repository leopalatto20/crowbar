import { createContext, use } from "react";

import type { Effort } from "./model";

// RIR vs RPE is one app-wide setting; until the settings screen exists, every screen reads the default.
export const EffortContext = createContext<Effort>("RIR");
export const useEffort = () => use(EffortContext);
