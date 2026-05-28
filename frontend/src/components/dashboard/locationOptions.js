export const WORLD_CITY_OPTIONS = [
  { label: 'Jakarta, Indonesia', latitude: -6.2088, longitude: 106.8456 },
  { label: 'Bandung, Indonesia', latitude: -6.9175, longitude: 107.6191 },
  { label: 'Yogyakarta, Indonesia', latitude: -7.7956, longitude: 110.3695 },
  { label: 'Surabaya, Indonesia', latitude: -7.2575, longitude: 112.7521 },
  { label: 'Denpasar, Indonesia', latitude: -8.6705, longitude: 115.2126 },
  { label: 'Medan, Indonesia', latitude: 3.5952, longitude: 98.6722 },
  { label: 'Makassar, Indonesia', latitude: -5.1477, longitude: 119.4327 },
  { label: 'Jayapura, Indonesia', latitude: -2.5916, longitude: 140.669 },
  { label: 'Singapore, Singapore', latitude: 1.3521, longitude: 103.8198 },
  { label: 'Kuala Lumpur, Malaysia', latitude: 3.139, longitude: 101.6869 },
  { label: 'Bangkok, Thailand', latitude: 13.7563, longitude: 100.5018 },
  { label: 'Tokyo, Japan', latitude: 35.6762, longitude: 139.6503 },
  { label: 'Sydney, Australia', latitude: -33.8688, longitude: 151.2093 },
  { label: 'Dubai, United Arab Emirates', latitude: 25.2048, longitude: 55.2708 },
  { label: 'London, United Kingdom', latitude: 51.5072, longitude: -0.1276 },
  { label: 'Berlin, Germany', latitude: 52.52, longitude: 13.405 },
  { label: 'Paris, France', latitude: 48.8566, longitude: 2.3522 },
  { label: 'Amsterdam, Netherlands', latitude: 52.3676, longitude: 4.9041 },
  { label: 'New York, United States', latitude: 40.7128, longitude: -74.006 },
  { label: 'San Francisco, United States', latitude: 37.7749, longitude: -122.4194 },
  { label: 'Toronto, Canada', latitude: 43.6532, longitude: -79.3832 },
]

export function findCityByLabel(label) {
  return WORLD_CITY_OPTIONS.find((city) => city.label === label)
}
