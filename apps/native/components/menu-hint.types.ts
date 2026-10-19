// For a list whose rows keep their actions in a long-press menu (ADR 0005): a footer names the
// gesture until the lifter first picks from a menu.
export type MenuHintProps = {
  showMenuHint: boolean;
  onMenuUse: () => void;
};
