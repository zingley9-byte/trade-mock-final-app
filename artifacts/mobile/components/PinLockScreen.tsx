import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated, StyleSheet, Text, TouchableOpacity, Vibration, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SvgIcon from "@/components/SvgIcon";
import { usePrivacy } from "@/context/PrivacyContext";

const PIN_LENGTH = 4;



const KEYS = [
  ["1","2","3"],
  ["4","5","6"],
  ["7","8","9"],
  ["","0","⌫"],
];

interface Props {
  /** "unlock" = verify existing PIN to open app, "setup" = create a new PIN */
  mode: "unlock" | "setup";
  /** For setup mode: first pass or confirm pass */
  setupStep?: "enter" | "confirm";
  firstPin?: string;
  onSuccess?: (pin?: string) => void;
  onCancel?: () => void;
  subtitle?: string;
}

export default function PinLockScreen({
  mode, setupStep = "enter", firstPin, onSuccess, onCancel, subtitle,
}: Props) {
  const insets = useSafeAreaInsets();
  const { verifyPin, biometricUnlock, privacy, biometricAvailable } = usePrivacy();

  const [pin, setPin]         = useState("");
  const [error, setError]     = useState("");
  const [shaking, setShaking] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = useCallback(() => {
    Vibration.vibrate(200);
    setShaking(true);
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8,   duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 50, useNativeDriver: true }),
    ]).start(() => setShaking(false));
  }, [shakeAnim]);

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length < PIN_LENGTH) return;

    const timer = setTimeout(async () => {
      if (mode === "unlock") {
        const ok = await verifyPin(pin);
        if (!ok) {
          shake();
          setError("Incorrect PIN. Try again.");
          setPin("");
        } else {
          onSuccess?.(pin);
        }
      } else {
        // setup mode
        if (setupStep === "enter") {
          onSuccess?.(pin);
        } else {
          // confirm step
          if (pin === firstPin) {
            onSuccess?.(pin);
          } else {
            shake();
            setError("PINs don't match. Try again.");
            setPin("");
          }
        }
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [pin]);

  function pressKey(k: string) {
    if (k === "⌫") {
      setPin(p => p.slice(0, -1));
      setError("");
      return;
    }
    if (k === "" || pin.length >= PIN_LENGTH) return;
    setError("");
    setPin(p => p + k);
  }

  const title = mode === "unlock"
    ? "Enter PIN"
    : setupStep === "enter"
      ? "Set New PIN"
      : "Confirm PIN";

  const showBiometric =
    mode === "unlock" && privacy.biometric && biometricAvailable;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        {onCancel && (
          <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Lock icon */}
      <View style={styles.iconCircle}>
        <SvgIcon name="lock-closed" size={32} color="#00c896" />
      </View>

      <Text style={styles.title}>{title}</Text>
      {subtitle ? (
        <Text style={styles.subtitle}>{subtitle}</Text>
      ) : null}

      {/* PIN dots */}
      <Animated.View
        style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}
      >
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i < pin.length && styles.dotFilled]}
          />
        ))}
      </Animated.View>

      {/* Error */}
      <Text style={styles.error}>{error}</Text>

      {/* Numpad */}
      <View style={styles.numpad}>
        {KEYS.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((k, ki) => (
              <TouchableOpacity
                key={ki}
                style={[styles.key, k === "" && styles.keyInvisible]}
                onPress={() => pressKey(k)}
                activeOpacity={k === "" ? 1 : 0.6}
                disabled={k === ""}
              >
                {k === "⌫" ? (
                  <SvgIcon name="backspace-outline" size={22} color="#fff" />
                ) : (
                  <Text style={styles.keyText}>{k}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      {/* Biometric */}
      {showBiometric && (
        <TouchableOpacity style={styles.biometricBtn} onPress={biometricUnlock}>
          <SvgIcon name="finger-print-outline" size={28} color="#00c896" />
          <Text style={styles.biometricText}>Use Biometric</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const DOT_SIZE = 14;
const KEY_SIZE = 72;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0a0e1a",
    alignItems: "center",
  },
  header: {
    width: "100%",
    height: 48,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 20,
  },
  cancelBtn: { padding: 8 },
  cancelText: { color: "#00c896", fontSize: 15, fontWeight: "600" },

  iconCircle: {
    width: 80, height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0,200,150,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  subtitle: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 18,
    marginTop: 32,
    marginBottom: 8,
  },
  dot: {
    width: DOT_SIZE, height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "transparent",
  },
  dotFilled: {
    backgroundColor: "#00c896",
    borderColor: "#00c896",
  },
  error: {
    color: "#f87171",
    fontSize: 13,
    height: 20,
    marginTop: 4,
    marginBottom: 12,
  },
  numpad: {
    gap: 12,
    marginTop: 8,
  },
  row: {
    flexDirection: "row",
    gap: 20,
  },
  key: {
    width: KEY_SIZE, height: KEY_SIZE,
    borderRadius: KEY_SIZE / 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  keyInvisible: {
    backgroundColor: "transparent",
  },
  keyText: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "400",
  },
  biometricBtn: {
    marginTop: 32,
    alignItems: "center",
    gap: 6,
  },
  biometricText: {
    color: "#00c896",
    fontSize: 13,
    fontWeight: "600",
  },
});
