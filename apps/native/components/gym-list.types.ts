import type { MenuHintProps } from "@/components/menu-hint.types";
import type { Gym } from "@/db/gyms";

export type GymListProps = MenuHintProps & {
  gyms: Gym[];
  onRename: (gym: Gym) => void;
  onDelete: (gym: Gym) => void;
};
