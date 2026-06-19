import { Redirect } from "expo-router"
import { ActivityIndicator, View } from "react-native"
import { useStore } from "../lib/store"

export default function Index() {
  const { session } = useStore()

  if (session === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  if (session) {
    return <Redirect href="/(tabs)" />
  }

  return <Redirect href="/login" />
}
