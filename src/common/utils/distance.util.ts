import { Injectable } from '@nestjs/common';

@Injectable()
export class DistanceUtilService {
  /**
   * Calculate distance in kilometers between two coordinates using Haversine formula
   * @param lat1 Latitude of origin
   * @param lon1 Longitude of origin
   * @param lat2 Latitude of destination
   * @param lon2 Longitude of destination
   * @returns Distance in kilometers, or null if any coordinate is missing
   */
  calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number | null {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;

    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  }

  /**
   * Generate Google Maps URL
   * @param lat1 Latitude of origin
   * @param lon1 Longitude of origin
   * @param lat2 Latitude of destination
   * @param lon2 Longitude of destination
   * @returns Google Maps URL
   */
  getGoogleMapsUrl(lat1: number, lon1: number, lat2: number, lon2: number): string {
    return `https://www.google.com/maps/dir/?api=1&origin=${lat1},${lon1}&destination=${lat2},${lon2}`;
  }
}
