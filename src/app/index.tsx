import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { getAllPledges } from "../services/pledges";
import { seedDemoData } from "../services/seedData";
import { getAllSites } from "../services/sites";
import { getAllVolunteers } from "../services/volunteers";

const statusColors: Record<string, string> = {
  Reported: "#B550E7",
  "Volunteers Assigned": "#E9C46A",
  "Cleanup Scheduled": "#4A90A4",
  Cleaned: "#2D6A4F",
};

// Calculates distance in km between two lat/lng points using the Haversine formula
const getDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatDistance = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
};

export default function Index() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [impactStats, setImpactStats] = useState({ siteCount: 0, volunteerCount: 0, pledgeCount: 0 });
  const [seeding, setSeeding] = useState(false);

  const getLocation = async () => {
    setErrorMsg(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setErrorMsg("Location access is needed to show nearby dumping sites.");
      return;
    }

    const currentLocation = await Location.getCurrentPositionAsync({});
    setLocation({
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
    });
  };

  useEffect(() => {
    getLocation();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [allSites, allVolunteers, allPledges] = await Promise.all([
        getAllSites(),
        getAllVolunteers(),
        getAllPledges(),
      ]);
      setSites(allSites);
      setImpactStats({
        siteCount: allSites.length,
        volunteerCount: allVolunteers.length,
        pledgeCount: allPledges.length,
      });
    } catch (error) {
      console.error("❌ Error fetching sites:", error);
    }
  }, []);

  // Refetch sites and impact stats every time this screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleSeedData = async () => {
    if (!location) return;
    setSeeding(true);
    try {
      await seedDemoData(location.latitude, location.longitude);
      await fetchData();
      Alert.alert("Done", "Demo data added.");
    } catch (error) {
      console.error("❌ Error seeding demo data:", error);
      Alert.alert("Error", "Couldn't seed demo data. Check the console.");
    } finally {
      setSeeding(false);
    }
  };

  if (errorMsg) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <Text style={styles.errorSubtext}>
          If nothing happens when you tap below, enable location access for this app in your device Settings.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={getLocation}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsButton} onPress={() => Linking.openSettings()}>
          <Text style={styles.settingsButtonText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.centered}>
        <Text>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={true}
      >
        {sites.map((site) => {
          const distanceKm = getDistanceKm(
            location.latitude,
            location.longitude,
            site.latitude,
            site.longitude
          );

          return (
            <Marker
              key={site.id}
              coordinate={{ latitude: site.latitude, longitude: site.longitude }}
              title={site.title}
              description={`${site.status} · ${formatDistance(distanceKm)}`}
              pinColor={statusColors[site.status] || "#E76F51"}
              onCalloutPress={() => router.push(`/site/${site.id}`)}
            />
          );
        })}
      </MapView>

      <View style={styles.impactCard}>
        <Text style={styles.impactText}>
          {impactStats.siteCount} sites reported · {impactStats.volunteerCount} volunteers · {impactStats.pledgeCount} pledges
        </Text>
      </View>

      {__DEV__ && (
        <TouchableOpacity
          style={[styles.seedButton, seeding && styles.seedButtonDisabled]}
          onPress={handleSeedData}
          disabled={seeding}
        >
          <Text style={styles.seedButtonText}>{seeding ? "Seeding..." : "Seed Demo Data"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
    textAlign: "center",
  },
  errorSubtext: {
    fontSize: 13,
    color: "#888",
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#1B3B6F",
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginBottom: 10,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  settingsButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  settingsButtonText: {
    color: "#1B3B6F",
    fontWeight: "600",
  },
  impactCard: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    backgroundColor: "#6B4FA0",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  impactText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  seedButton: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    backgroundColor: "#6B4FA0",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  seedButtonDisabled: {
    opacity: 0.6,
  },
  seedButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
});