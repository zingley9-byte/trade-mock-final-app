import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import SvgIcon from "@/components/SvgIcon";

interface Section {
  heading?: string;
  body: string;
  items?: string[];
}

interface Props {
  title: string;
  badge?: string;
  badgeColor?: string;
  sections: Section[];
}

export default function LegalScreen({ title, badge, badgeColor = "#3b82f6", sections }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <SvgIcon name="arrow-back-outline" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          {badge && (
            <View style={[s.badge, { backgroundColor: badgeColor + "20" }]}>
              <Text style={[s.badgeTxt, { color: badgeColor }]}>{badge}</Text>
            </View>
          )}
          <Text style={[s.headerTitle, { color: colors.foreground }]}>{title}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((sec, i) => (
          <View key={i} style={s.section}>
            {sec.heading && (
              <Text style={[s.heading, { color: colors.foreground }]}>{sec.heading}</Text>
            )}
            {sec.body ? (
              <Text style={[s.body, { color: colors.mutedForeground }]}>{sec.body}</Text>
            ) : null}
            {sec.items && sec.items.map((item, j) => (
              <View key={j} style={s.listRow}>
                <View style={[s.bullet, { backgroundColor: badgeColor }]} />
                <Text style={[s.listItem, { color: colors.mutedForeground }]}>{item}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={[s.footer, { borderTopColor: colors.border }]}>
          <Text style={[s.footerTxt, { color: colors.mutedForeground }]}>Trade Mock Pro · Practice. Learn. Trade.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn:      { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20 },
  headerCenter: { flex: 1, alignItems: "center", gap: 4 },
  headerTitle:  { fontSize: 17, fontWeight: "700", letterSpacing: -0.3 },
  badge:        { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeTxt:     { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },

  scroll:   { flex: 1 },
  content:  { paddingHorizontal: 20, paddingTop: 24 },

  section:  { marginBottom: 24 },
  heading:  { fontSize: 15, fontWeight: "700", marginBottom: 8, letterSpacing: -0.2 },
  body:     { fontSize: 14, lineHeight: 22, marginBottom: 4 },
  listRow:  { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  bullet:   { width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  listItem: { flex: 1, fontSize: 14, lineHeight: 21 },

  footer:    { marginTop: 16, paddingTop: 20, borderTopWidth: StyleSheet.hairlineWidth, alignItems: "center" },
  footerTxt: { fontSize: 11, letterSpacing: 0.3 },
});
