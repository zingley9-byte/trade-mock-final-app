import { useColorScheme } from "react-native";
import colors from "@/constants/colors";

type ColorScheme = typeof colors.light;

export function useColors(): ColorScheme & { radius: number } {
  const scheme = useColorScheme();
  const palette = scheme === "dark" ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
