import * as ImagePicker from "expo-image-picker";

export async function pickImage() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    return { error: "Photo access is off.", uri: null as string | null, mime: "" };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]) {
    return { error: null, uri: null as string | null, mime: "" };
  }

  const asset = result.assets[0];
  return {
    error: null,
    uri: asset.uri,
    mime: asset.mimeType ?? "image/jpeg",
  };
}
