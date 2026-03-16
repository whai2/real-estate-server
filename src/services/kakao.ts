export interface GeocodingResult {
  lat: number;
  lng: number;
}

export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  // 괄호 부분 제거 (예: "서울시 강남구 역삼동 123 (건물명)" → "서울시 강남구 역삼동 123")
  const cleanAddress = address.replace(/\s*\(.*?\)\s*$/, '').trim();
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(cleanAddress)}`;

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
