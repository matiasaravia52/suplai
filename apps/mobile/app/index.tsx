import { Redirect } from "expo-router"
import { useStore } from "../lib/store"

export default function Index() {
  const { session } = useStore()

  if (session) {
    return <Redirect href="/(tabs)" />
  }

  return <Redirect href="/login" />
}
