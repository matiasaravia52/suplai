import { useState, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { useRouter } from "expo-router"
import { useLocation } from "../hooks/useLocation"
import { api } from "../lib/api"

export default function PuntoNuevoScreen() {
  const router = useRouter()
  const { getCurrentPosition } = useLocation()

  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getCurrentPosition().then((pos) => {
      if (pos) {
        setLat(pos.lat)
        setLng(pos.lng)
      }
    })
  }, [getCurrentPosition])

  async function handleSave() {
    const trimmedNombre = nombre.trim()
    if (!trimmedNombre) {
      Alert.alert("Campo requerido", "Ingresa el nombre del punto.")
      return
    }
    if (lat == null || lng == null) {
      Alert.alert("GPS no disponible", "Espera a que se obtenga la ubicación actual.")
      return
    }

    setSaving(true)
    try {
      await api.post("/api/tracking/unknown-point", {
        nombre: trimmedNombre,
        descripcion: descripcion.trim() || undefined,
        lat,
        lng,
      })
      Alert.alert("Guardado", "Punto registrado correctamente.", [
        { text: "OK", onPress: () => router.back() },
      ])
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al guardar"
      Alert.alert("Error", message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Text style={styles.gpsInfo}>
          GPS actual: {lat != null ? lat.toFixed(4) : "..."}, {lng != null ? lng.toFixed(4) : "..."}
        </Text>

        <Text style={styles.label}>Nombre del punto</Text>
        <TextInput
          style={styles.input}
          placeholder="Nombre"
          value={nombre}
          onChangeText={setNombre}
          editable={!saving}
        />

        <Text style={styles.label}>Descripción (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Descripción"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          numberOfLines={3}
          editable={!saving}
        />

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>Guardar</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  gpsInfo: {
    fontSize: 13,
    color: "#666",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginBottom: 20,
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: "#f9f9f9",
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  saveButton: {
    height: 48,
    backgroundColor: "#2563eb",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
})
