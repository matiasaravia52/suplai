"use client"

import { useState, useRef, useEffect } from "react"

interface GeoResult {
  place_name: string
  center: [number, number] // [lng, lat]
}

interface Props {
  defaultValue?: string
  defaultLat?: number | null
  defaultLng?: number | null
  required?: boolean
}

export default function AddressGeocoder({ defaultValue = "", defaultLat, defaultLng, required }: Props) {
  const [query, setQuery] = useState(defaultValue)
  const [results, setResults] = useState<GeoResult[]>([])
  const [lat, setLat] = useState<string>(defaultLat?.toString() ?? "")
  const [lng, setLng] = useState<string>(defaultLng?.toString() ?? "")
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  async function search(text: string) {
    if (!text || text.length < 3 || !token) return setResults([])
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${token}&country=AR&limit=5&language=es&types=address,place`
    const res = await fetch(url)
    if (!res.ok) return
    const data = await res.json()
    setResults(data.features ?? [])
    setOpen(true)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    setLat("")
    setLng("")
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 350)
  }

  function handleSelect(result: GeoResult) {
    setQuery(result.place_name)
    setLng(result.center[0].toString())
    setLat(result.center[1].toString())
    setResults([])
    setOpen(false)
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  return (
    <div className="relative">
      <input
        name="direccion"
        type="text"
        value={query}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => results.length > 0 && setOpen(true)}
        required={required}
        placeholder="Ej: Av. Corrientes 1234, Buenos Aires"
        autoComplete="off"
        className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-56 overflow-auto text-sm">
          {results.map((r, i) => (
            <li
              key={i}
              onMouseDown={() => handleSelect(r)}
              className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-gray-700"
            >
              {r.place_name}
            </li>
          ))}
        </ul>
      )}

      <input type="hidden" name="lat" value={lat} />
      <input type="hidden" name="lng" value={lng} />

      {lat && lng && (
        <p className="text-xs text-gray-400 mt-1">
          {parseFloat(lat).toFixed(6)}, {parseFloat(lng).toFixed(6)}
        </p>
      )}
    </div>
  )
}
