import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ensureSignedIn, getCurrentUserId } from "../services/auth";
import { getPledgesForUser } from "../services/pledges";
import { getAllSites, getSitesReportedByUser } from "../services/sites";
import { getVolunteerSignupsForUser } from "../services/volunteers";

export default function MyActivity() {
  const [loading, setLoading] = useState(true);
  const [notSignedIn, setNotSignedIn] = useState(false);
  const [reportedSites, setReportedSites] = useState<any[]>([]);
  const [volunteerSignups, setVolunteerSignups] = useState<any[]>([]);
  const [pledges, setPledges] = useState<any[]>([]);
  const [siteTitles, setSiteTitles] = useState<Record<string, string>>({});

  const loadActivity = async () => {
    setLoading(true);
    setNotSignedIn(false);
    try {
      let userId = getCurrentUserId();

      // Auth may not have finished yet (e.g. slow connection, fresh install) — try once to establish it
      if (!userId) {
        userId = await ensureSignedIn();
      }

      if (!userId) {
        setNotSignedIn(true);
        setLoading(false);
        return;
      }

      const [allSites, myReported, mySignups, myPledges] = await Promise.all([
        getAllSites(),
        getSitesReportedByUser(userId),
        getVolunteerSignupsForUser(userId),
        getPledgesForUser(userId),
      ]);

      const titleMap: Record<string, string> = {};
      allSites.forEach((site) => {
        titleMap[site.id] = site.title;
      });

      setReportedSites(myReported);
      setVolunteerSignups(mySignups);
      setPledges(myPledges);
      setSiteTitles(titleMap);
    } catch (error) {
      console.error("❌ Error loading activity:", error);
      setNotSignedIn(true);
    } finally {
      setLoading(false);
    }
  };

  // Refetch every time this tab comes into focus, not just on first mount
  useFocusEffect(
    useCallback(() => {
      loadActivity();
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (notSignedIn) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>We couldn't sign you in.</Text>
        <Text style={styles.errorSubtext}>Check your connection and try again.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadActivity}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>My Activity</Text>

      <Text style={styles.sectionHeader}>Sites I Reported ({reportedSites.length})</Text>
      {reportedSites.length === 0 ? (
        <Text style={styles.emptyText}>You haven't reported any sites yet.</Text>
      ) : (
        reportedSites.map((site) => (
          <Text key={site.id} style={styles.listItem}>
            • {site.title} — {site.status}
          </Text>
        ))
      )}

      <Text style={styles.sectionHeader}>Sites I'm Volunteering For ({volunteerSignups.length})</Text>
      {volunteerSignups.length === 0 ? (
        <Text style={styles.emptyText}>You haven't signed up to volunteer anywhere yet.</Text>
      ) : (
        volunteerSignups.map((signup) => (
          <Text key={signup.id} style={styles.listItem}>
            • {siteTitles[signup.siteId] ?? "Unknown site"} {signup.cleanupDate ? `— ${signup.cleanupDate}` : ""}
          </Text>
        ))
      )}

      <Text style={styles.sectionHeader}>Equipment I've Pledged ({pledges.length})</Text>
      {pledges.length === 0 ? (
        <Text style={styles.emptyText}>You haven't pledged any equipment yet.</Text>
      ) : (
        pledges.map((pledge) => (
          <Text key={pledge.id} style={styles.listItem}>
            • {pledge.item} (x{pledge.quantity}) — {siteTitles[pledge.siteId] ?? "Unknown site"}
          </Text>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    padding: 20,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 6,
  },
  emptyText: {
    color: "#888",
  },
  listItem: {
    fontSize: 14,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
    textAlign: "center",
  },
  errorSubtext: {
    fontSize: 14,
    color: "#888",
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#1B3B6F",
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});