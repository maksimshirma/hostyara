import styles from "./SpaceSwitcherStub.module.css";

export interface SpaceSwitcherStubProps {
  name: string;
}

// Shows the open household; switching between the person's households is
// still to come — see IA §1 "Личная зона".
export function SpaceSwitcherStub({ name }: SpaceSwitcherStubProps) {
  return (
    <div className={styles.stub} title="Переключатель пространства (заглушка)">
      {name}
    </div>
  );
}
