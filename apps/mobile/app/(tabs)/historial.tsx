import { useState, useCallback } from "react"
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  SectionList,
  RefreshControl,
} from "react-native"
import { useFocusEffect } from "expo-router"
import { api } from "../../lib/api"
import type { Visit } from "@suplai/types"

interface VisitRow extends Visit {
  client_point_nombre: string
}

interface Section {
  title: string
  data: VisitRow[]
}

function toLocalDateStr(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
}

function groupByDay(visits: VisitRow[]): Section[] {
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })

  const groups: Record<string, { data: VisitRow[]; dateStr: string }> = {}

  for (const v of visits) {
    const dateStr = toLocalDateStr(v.checkin_at)
    let label: string
    if (dateStr === todayStr) {
      label = "Hoy"
    } else if (dateStr === yesterdayStr) {
      label = "Ayer"
    } else {
      label = new Date(dateStr + "T12:00:00").toLocaleDateString("es-AR", {
        weekday: "long", day: "numeric", month: "long",
      })
      label = label.charAt(0).toUpperCase() + label.slice(1)
    }

    if (!groups[label]) groups[label] = { data: [], dateStr }
    groups[label].data.push(v)
  }

  return Object.entries(groups)
    .sort(([, a], [, b]) => b.dateStr.localeCompare(a.dateStr))
    .map(([title, { data }]) => ({ title, data }))
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function HistorialScreen() {
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchVisits = useCallback(async () => {
    try {
      const data = await api.get<{ visits: VisitRow[] }>("/api/tracking/my-visits")
      setSections(groupByDay(data.visits ?? []))
    } catch {
      setSections([])
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      fetchVisits().finally(() => setLoading(false))
    }, [fetchVisits]),
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchVisits()
    setRefreshing(false)
  }, [fetchVisits])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  if (sections.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Sin visitas registradas</Text>
      </View>
    )
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      renderSectionHeader={({ section: { title } }) => (
        <Text style={styles.sectionTitle}>{title}</Text>
      )}
      renderItem={({ item }) => (
        <View style={styles.visitItem}>
          <Text style={styles.visitIcon}>✓</Text>
          <View style={styles.visitInfo}>
            <Text style={styles.visitName}>{item.client_point_nombre}</Text>
          </View>
          <Text style={styles.visitTime}>{formatTime(item.checkin_at)}</Text>
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  list: {
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
    textTransform: "uppercase",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: "#f9f9f9",
  },
  visitItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  visitIcon: {
    fontSize: 16,
    color: "#22c55e",
    fontWeight: "700",
    width: 24,
  },
  visitInfo: {
    flex: 1,
    marginLeft: 4,
  },
  visitName: {
    fontSize: 15,
    color: "#1a1a2e",
  },
  visitTime: {
    fontSize: 14,
    color: "#999",
  },
})
