export interface GeocodingResult {
  lat: number;
  lng: number;
}

export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
    },
  });

  if (!response.ok) {
    console.error('[Kakao Geocoding] API error:', response.status);
    return null;
  }

  const data: any = await response.json();

  if (data.documents && data.documents.length > 0) {
    const doc = data.documents[0];
    return {
      lat: parseFloat(doc.y),
      lng: parseFloat(doc.x),
    };
  }

  return null;
}
