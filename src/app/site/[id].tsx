import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getCurrentUserId } from "../../services/auth";
import { formatCleanupDate, getUpcomingCleanupDates } from "../../services/dates";
import { scheduleCleanupReminders } from "../../services/notifications";
import { createPledge, getPledgesForSite } from "../../services/pledges";
import { getAllSites, updateSiteStatus } from "../../services/sites";
import { getVolunteersForSite, signUpVolunteer } from "../../services/volunteers";

// Maps a site's status to badge colors
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Reported: { bg: "#E9C46A", text: "#2B2B2B" },
  "Volunteers Assigned": { bg: "#8E6FCE", text: "#fff" },
  "Cleanup Scheduled": { bg: "#6B4FA0", text: "#fff" },
  Cleaned: { bg: "#4CAF6D", text: "#fff" },
};
const DEFAULT_STATUS_COLOR = { bg: "#B0B0B0", text: "#2B2B2B" };

const getStatusColor = (status: string) => STATUS_COLORS[status] ?? DEFAULT_STATUS_COLOR;

export default function SiteDetail() {
  const { id } = useLocalSearchParams();

  // Core site data
  const [site, setSite] = useState<any>(null);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [pledges, setPledges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Volunteer form state
  const [showVolunteerForm, setShowVolunteerForm] = useState(false);
  const [volunteerName, setVolunteerName] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [volunteerNote, setVolunteerNote] = useState("");
  const [submittingVolunteer, setSubmittingVolunteer] = useState(false);
  const upcomingDates = getUpcomingCleanupDates();

  // Pledge form state
  const [showPledgeForm, setShowPledgeForm] = useState(false);
  const [pledgeName, setPledgeName] = useState("");
  const [pledgeItem, setPledgeItem] = useState("");
  const [pledgeQty, setPledgeQty] = useState("1");
  const [submittingPledge, setSubmittingPledge] = useState(false);

  const loadData = async () => {
    try {
      const allSites = await getAllSites();
      setSite(allSites.find((s) => s.id === id));
      setVolunteers(await getVolunteersForSite(id as string));
      setPledges(await getPledgesForSite(id as string));
    } catch (error) {
      console.error("❌ Error loading site detail:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleVolunteerSubmit = async () => {
    if (!volunteerName) {
      Alert.alert("Missing name", "Please enter your name.");
      return;
    }
    if (!selectedDate) {
      Alert.alert("Pick a date", "Please select a cleanup date.");
      return;
    }

    setSubmittingVolunteer(true);
    try {
      await signUpVolunteer(
        id as string,
        getCurrentUserId(),
        volunteerName,
        volunteerNote,
        formatCleanupDate(selectedDate)
      );

      // Auto-advance status: only bump "Reported" sites forward, never downgrade further ones
      if (site?.status === "Reported") {
        await updateSiteStatus(id as string, "Volunteers Assigned");
      }

      await scheduleCleanupReminders(selectedDate, site.title);
      Alert.alert("Thanks!", "You've signed up to volunteer.");
      setVolunteerName("");
      setVolunteerNote("");
      setSelectedDate(null);
      setShowVolunteerForm(false);
      await loadData();
    } catch (error) {
      console.error("❌ Error signing up:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setSubmittingVolunteer(false);
    }
  };

  const handlePledgeSubmit = async () => {
    if (!pledgeName) {
      Alert.alert("Missing name", "Please enter your name.");
      return;
    }
    if (!pledgeItem) {
      Alert.alert("Missing info", "Please enter what you're pledging.");
      return;
    }

    setSubmittingPledge(true);
    try {
      await createPledge(
        id as string,
        getCurrentUserId(),
        pledgeName,
        pledgeItem,
        parseInt(pledgeQty) || 1
      );
      Alert.alert("Thanks!", "Your pledge has been recorded.");
      setPledgeName("");
      setPledgeItem("");
      setPledgeQty("1");
      setShowPledgeForm(false);
      await loadData();
    } catch (error) {
      console.error("❌ Error pledging:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setSubmittingPledge(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!site) {
    return (
      <View style={styles.centered}>
        <Text>Site not found.</Text>
      </View>
    );
  }

  const statusColor = getStatusColor(site.status);

  return (
    <ScrollView style={styles.container}>
      {site.photoUrl && <Image source={{ uri: site.photoUrl }} style={styles.photo} />}

      <View style={styles.content}>
        <Text
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor.bg, color: statusColor.text },
          ]}
        >
          {site.status}
        </Text>
        <Text style={styles.title}>{site.title}</Text>
        <Text style={styles.description}>{site.description}</Text>

        {/* Action buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowVolunteerForm(!showVolunteerForm)}
          >
            <Text style={styles.actionButtonText}>Volunteer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.pledgeButton]}
            onPress={() => setShowPledgeForm(!showPledgeForm)}
          >
            <Text style={styles.actionButtonText}>Pledge Equipment</Text>
          </TouchableOpacity>
        </View>

        {/* Volunteer form */}
        {showVolunteerForm && (
          <View style={styles.formBox}>
            <Text style={styles.formLabel}>Your name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Adenike"
              value={volunteerName}
              onChangeText={setVolunteerName}
            />

            <Text style={styles.formLabel}>Pick a cleanup date</Text>
            {upcomingDates.map((date, index) => {
              const isSelected = selectedDate?.getTime() === date.getTime();
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.dateOption, isSelected && styles.dateOptionSelected]}
                  onPress={() => setSelectedDate(date)}
                >
                  <Text style={isSelected ? styles.dateOptionTextSelected : styles.dateOptionText}>
                    {formatCleanupDate(date)}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <Text style={styles.formLabel}>Optional note</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. I can bring a truck"
              value={volunteerNote}
              onChangeText={setVolunteerNote}
            />
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleVolunteerSubmit}
              disabled={submittingVolunteer}
            >
              <Text style={styles.submitText}>
                {submittingVolunteer ? "Submitting..." : "Confirm Volunteer"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Pledge form */}
        {showPledgeForm && (
          <View style={styles.formBox}>
            <Text style={styles.formLabel}>Your name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Adenike"
              value={pledgeName}
              onChangeText={setPledgeName}
            />

            <Text style={styles.formLabel}>Item</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Heavy-duty gloves"
              value={pledgeItem}
              onChangeText={setPledgeItem}
            />
            <Text style={styles.formLabel}>Quantity</Text>
            <TextInput
              style={styles.input}
              placeholder="1"
              keyboardType="numeric"
              value={pledgeQty}
              onChangeText={setPledgeQty}
            />
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handlePledgeSubmit}
              disabled={submittingPledge}
            >
              <Text style={styles.submitText}>
                {submittingPledge ? "Submitting..." : "Confirm Pledge"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Volunteers list */}
        <Text style={styles.sectionHeader}>Volunteers ({volunteers.length})</Text>
        {volunteers.length === 0 ? (
          <Text style={styles.emptyText}>No volunteers yet.</Text>
        ) : (
          volunteers.map((v) => (
            <Text key={v.id} style={styles.listItem}>
              • {v.name} {v.cleanupDate ? `— ${v.cleanupDate}` : ""} {v.note ? `(${v.note})` : ""}
            </Text>
          ))
        )}

        {/* Pledges list */}
        <Text style={styles.sectionHeader}>Pledged Equipment ({pledges.length})</Text>
        {pledges.length === 0 ? (
          <Text style={styles.emptyText}>No pledges yet.</Text>
        ) : (
          pledges.map((p) => (
            <Text key={p.id} style={styles.listItem}>
              • {p.item} (x{p.quantity})
            </Text>
          ))
        )}
      </View>
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
  },
  photo: {
    width: "100%",
    height: 220,
  },
  content: {
    padding: 20,
  },
  statusBadge: {
    alignSelf: "flex-start",
    fontWeight: "600",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
    overflow: "hidden",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: "#444",
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#1B3B6F",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  pledgeButton: {
    backgroundColor: "#1B3B6F",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  formBox: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  submitButton: {
    backgroundColor: "#1B3B6F",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  submitText: {
    color: "#fff",
    fontWeight: "600",
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
  dateOption: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  dateOptionSelected: {
    backgroundColor: "#0c2c1e",
    borderColor: "#0a1a13",
  },
  dateOptionText: {
    color: "#2B2B2B",
  },
  dateOptionTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
});