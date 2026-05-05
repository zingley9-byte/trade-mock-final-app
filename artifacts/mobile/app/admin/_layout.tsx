import { Stack } from "expo-router";
import React from "react";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="users" />
      <Stack.Screen name="user-detail" />
      <Stack.Screen name="coins" />
      <Stack.Screen name="announcements" />
      <Stack.Screen name="earnings" />
      <Stack.Screen name="google-ads" />
      <Stack.Screen name="trades" />
      <Stack.Screen name="user-trades" />
    </Stack>
  );
}
