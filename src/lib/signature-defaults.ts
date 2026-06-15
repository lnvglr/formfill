/** ISO date (YYYY-MM-DD) for HTML date inputs. */
export function getTodayForDateInput(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function requestCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 300_000,
    });
  });
}

async function reverseGeocodeCity(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      localityLanguage: "de",
    });
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`
    );
    if (!response.ok) return null;

    const data = (await response.json()) as {
      city?: string;
      locality?: string;
      principalSubdivision?: string;
    };

    return (
      data.city?.trim() ||
      data.locality?.trim() ||
      data.principalSubdivision?.trim() ||
      null
    );
  } catch {
    return null;
  }
}

/** Ask for device location and return a city name, with optional profile fallback. */
export async function resolveSignatureLocation(
  fallbackOrt?: string
): Promise<string | null> {
  try {
    const position = await requestCurrentPosition();
    const city = await reverseGeocodeCity(
      position.coords.latitude,
      position.coords.longitude
    );
    if (city) return city;
  } catch {
    // Permission denied, timeout, or unsupported — use fallback below.
  }

  const trimmed = fallbackOrt?.trim();
  return trimmed || null;
}
