import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity
} from "react-native";
import { getCurrentUserId } from "../services/auth";
import { createSite } from "../services/sites";

const CLOUD_NAME = "aiiyuu0a";
const UPLOAD_PRESET = "Isabiclean_upload";

export default function Report() {
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "We need camera access to take a photo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.5,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const uploadToCloudinary = async (uri: string) => {
  return new Promise<string>((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", {
      uri,
      type: "image/jpeg",
      name: "upload.jpg",
    } as any);
    formData.append("upload_preset", UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);

    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve(data.secure_url);
      } else {
        reject(new Error(`Upload failed: ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during upload"));
    };

    xhr.send(formData);
  });
};

  const handleSubmit = async () => {
    if (!description || !photoUri) {
      Alert.alert("Missing info", "Please add a description and a photo.");
      return;
    }

    setUploading(true);
    try {
      const locationPermission = await Location.requestForegroundPermissionsAsync();
      if (locationPermission.status !== "granted") {
        Alert.alert("Permission needed", "We need location access to report a site.");
        setUploading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});

      const photoUrl = await uploadToCloudinary(photoUri);

      await createSite(
        {
          title: description.slice(0, 40),
          description,
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          photoUrl,
        },
        getCurrentUserId()
      );

      Alert.alert("Success", "Site reported! Thank you.");
      setDescription("");
      setPhotoUri(null);
    } catch (error) {
      console.error("❌ Error reporting site:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Photo</Text>
      <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photoPreview} />
        ) : (
          <Text>Tap to take a photo</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.input}
        multiline
        placeholder="Describe the site..."
        value={description}
        onChangeText={setDescription}
      />

      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        disabled={uploading}
      >
        <Text style={styles.submitText}>
          {uploading ? "Submitting..." : "Submit Report"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  photoButton: {
    height: 180,
    backgroundColor: "#eee",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  photoPreview: {
    width: "100%",
    height: "100%",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#1B3B6F",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  submitText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});