import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Announcement, useAdmin } from "@/context/AdminContext";

const ADMIN_BG = "#0a0e1a";
const SURFACE  = "#111827";
const BORDER   = "#1e293b";
const PRIMARY  = "#00c896";
const MUTED    = "#64748b";
const FG       = "#f1f5f9";
const BEAR     = "#ff4d4d";

type AType = "info" | "warning" | "success";

const TYPE_COLORS: Record<AType, string> = {
  info: "#3b82f6",
  warning: "#f59e0b",
  success: "#22c55e",
};

const TYPE_ICONS: Record<AType, string> = {
  info: "information-circle-outline",
  warning: "warning-outline",
  success: "checkmark-circle-outline",
};

export default function AdminAnnouncements() {
  const insets = useSafeAreaInsets();
  const { announcements, addAnnouncement, updateAnnouncement, deleteAnnouncement, isAdmin } = useAdmin();
  const [addModal, setAddModal] = useState(false);
  const [title, setTitle]   = useState("");
  const [message, setMsg]   = useState("");
  const [aType, setAType]   = useState<AType>("info");

  if (!isAdmin) { router.replace("/admin"); return null; }

  async function handleCreate() {
    if (!title.trim() || !message.trim()) { Alert.alert("Error", "Fill in title and message"); return; }
    await addAnnouncement({ title: title.trim(), message: message.trim(), type: aType, active: true });
    setAddModal(false);
    setTitle("");
    setMsg("");
    setAType("info");
  }

  function handleDelete(a: Announcement) {
    Alert.alert("Delete", `Delete "${a.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteAnnouncement(a.id) },
    ]);
  }

  function renderAnnouncement({ item: a }: { item: Announcement }) {
    const color = TYPE_COLORS[a.type];
    return (
      <View style={s.card}>
        <View style={s.cardTop}>
          <View style={[s.typeIcon, { backgroundColor: color + "22" }]}>
            <Ionicons name={TYPE_ICONS[a.type] as any} size={16} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>{a.title}</Text>
            <Text style={s.cardDate}>{new Date(a.createdAt).toLocaleDateString("en-IN")}</Text>
          </View>
          <Switch
            value={a.active}
            onValueChange={(v) => updateAnnouncement(a.id, { active: v })}
            trackColor={{ false: BORDER, true: PRIMARY }}
            thumbColor={a.active ? "#fff" : MUTED}
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
          <TouchableOpacity onPress={() => handleDelete(a)} style={{ padding: 4 }}>
            <Ionicons name="trash-outline" size={16} color={BEAR} />
          </TouchableOpacity>
        </View>
        <Text style={s.cardMsg}>{a.message}</Text>
        <View style={[s.typeBadge, { backgroundColor: color + "22" }]}>
          <Text style={[s.typeText, { color }]}>{a.type.toUpperCase()}</Text>
          <View style={[s.dot, { backgroundColor: a.active ? "#22c55e" : MUTED }]} />
          <Text style={[s.typeText, { color: a.active ? "#22c55e" : MUTED }]}>{a.active ? "ACTIVE" : "INACTIVE"}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back-outline" size={20} color={FG} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Announcements ({announcements.length})</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setAddModal(true)}>
          <Ionicons name="add-outline" size={16} color="#fff" />
          <Text style={s.addBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {announcements.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="notifications-off-outline" size={40} color={MUTED} />
          <Text style={s.emptyText}>No announcements yet</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => setAddModal(true)}>
            <Text style={s.emptyBtnText}>Create First Announcement</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(a) => a.id}
          renderItem={renderAnnouncement}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 40 }}
        />
      )}

      {/* Add Modal */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <Pressable style={s.backdrop} onPress={() => setAddModal(false)} />
        <View style={s.sheet}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={s.handle} />
            <Text style={s.sheetTitle}>New Announcement</Text>

            <Text style={s.fieldLabel}>TYPE</Text>
            <View style={s.typeRow}>
              {(["info", "warning", "success"] as AType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[s.typeBtn, aType === t && { backgroundColor: TYPE_COLORS[t] + "33", borderColor: TYPE_COLORS[t] }]}
                  onPress={() => setAType(t)}
                >
                  <Ionicons name={TYPE_ICONS[t] as any} size={14} color={aType === t ? TYPE_COLORS[t] : MUTED} />
                  <Text style={[s.typeBtnText, { color: aType === t ? TYPE_COLORS[t] : MUTED }]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>TITLE</Text>
            <TextInput
              style={s.input}
              placeholder="Announcement title"
              placeholderTextColor={MUTED}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={s.fieldLabel}>MESSAGE</Text>
            <TextInput
              style={[s.input, { height: 100, textAlignVertical: "top", paddingTop: 12 }]}
              placeholder="Write your announcement…"
              placeholderTextColor={MUTED}
              value={message}
              onChangeText={setMsg}
              multiline
            />

            <TouchableOpacity style={s.confirmBtn} onPress={handleCreate} activeOpacity={0.85}>
              <Ionicons name="send-outline" size={16} color="#fff" />
              <Text style={s.confirmText}>Publish Announcement</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
    backgroundColor: SURFACE,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: FG, flex: 1 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: PRIMARY, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  card: { backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  typeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14, fontWeight: "600", color: FG },
  cardDate: { fontSize: 11, color: MUTED, marginTop: 2 },
  cardMsg: { fontSize: 13, color: MUTED, lineHeight: 19 },
  typeBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  dot: { width: 6, height: 6, borderRadius: 3 },

  emptyText: { fontSize: 14, color: MUTED },
  emptyBtn: { marginTop: 4, backgroundColor: PRIMARY, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: "#fff", fontWeight: "700" },

  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "90%",
    backgroundColor: SURFACE, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: BORDER, paddingHorizontal: 20, paddingBottom: 40,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: "center", marginTop: 10, marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: FG, marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: MUTED, letterSpacing: 0.5, marginBottom: 8 },
  typeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  typeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: BORDER, backgroundColor: ADMIN_BG },
  typeBtnText: { fontSize: 12, fontWeight: "600" },
  input: {
    backgroundColor: ADMIN_BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 16, paddingVertical: 14, color: FG, fontSize: 15, marginBottom: 16,
  },
  confirmBtn: { backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  confirmText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
