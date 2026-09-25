import { Text } from "ink";
import { useFrame } from "../useFrame";
import { COLOR, SPINNER } from "../theme";

export function Spinner({ color = COLOR.fox }: { color?: string }) {
  const n = useFrame();
  return <Text color={color}>{SPINNER[n % SPINNER.length]}</Text>;
}
