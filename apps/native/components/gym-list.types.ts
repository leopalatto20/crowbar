import type { Gym } from "@/db/gyms";

export type GymListProps = {
  gyms: Gym[];
  onRename: (gym: Gym) => void;
  onDelete: (gym: Gym) => void;
};
