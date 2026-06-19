import { useState } from "react"
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
import { supabase } from "../lib/supabase"
import { useStore } from "../lib/store"
import { setApiAuth } from "../lib/api"

export default function LoginScreen() {
  const [subdomain, setSubdomain] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const { setSession } = useStore()

  async function handleLogin() {
    const trimmedSubdomain = subdomain.trim().toLowerCase()
    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedSubdomain || !trimmedEmail || !password) {
      Alert.alert("Campos requeridos", "Completa todos los campos para ingresar.")
      return
    }

    setLoading(true)

    try {
      const apiDomain = process.env.EXPO_PUBLIC_API_DOMAIN ?? "suplai.lat"
      const apiBaseUrl = `https://${trimmedSubdomain}.${apiDomain}`

      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })

      if (error) {
        Alert.alert("Error de autenticación", error.message)
        return
      }

      if (!data.session) {
        Alert.alert("Error", "No se pudo iniciar sesión. Intenta de nuevo.")
        return
      }

      setSession(data.session, apiBaseUrl)
      setApiAuth(apiBaseUrl, data.session.access_token)
      router.replace("/(tabs)")
    } catch {
      Alert.alert("Error de conexión", "No se pudo conectar al servidor. Verifica tu conexión a internet.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Suplai</Text>
        <Text style={styles.subtitle}>Ingresa a tu cuenta</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Subdominio de tu empresa</Text>
          <TextInput
            style={styles.input}
            placeholder="ej: lopez"
            value={subdomain}
            onChangeText={setSubdomain}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="juan@lopez.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Ingresar</Text>
            )}
          </TouchableOpacity>
        </View>
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
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1a1a2e",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: -4,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  button: {
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
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
})
