"use client"

import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native"
import { useStore } from "../../lib/store"
import { supabase } from "../../lib/supabase"

export default function PerfilScreen() {
  const { session, apiBaseUrl, clearSession } = useStore()

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Seguro que querés salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut()
          clearSession()
        },
      },
    ])
  }

  const email = session?.user?.email ?? "—"
  const tenant = apiBaseUrl?.replace(/https?:\/\//, "").split(".")[0] ?? "—"

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{email[0]?.toUpperCase() ?? "?"}</Text>
        </View>
        <Text style={styles.email}>{email}</Text>
        <Text style={styles.tenant}>{tenant}</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 24,
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    width: "100%",
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
  },
  email: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: 4,
  },
  tenant: {
    fontSize: 13,
    color: "#666",
  },
  logoutButton: {
    marginTop: 32,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 15,
    fontWeight: "600",
  },
})
