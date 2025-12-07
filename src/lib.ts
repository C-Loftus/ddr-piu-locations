const API_URL = "https://lucky-lake-5f6e.bgzkc2przgzzc.workers.dev";

export const Game = {
  PUMP_IT_UP: 7,
  DANCE_DANCE_REVOLUTION: 1,
} as const;

export type Game = (typeof Game)[keyof typeof Game];

export interface CloudFlareResponse {
    success: boolean;
    arcades: ArcardeResponse[];
}

export interface ArcardeResponse {
    id: number
    name: string
    address: string
    country: string
    latitude: number
    longitude: number
    contactNumber: string
    information: string
    lastUpdateTime: string
    lastUpdateDifference: string 
    website: string
    // properties I added after the API call
    ddr?: boolean
    piu?: boolean
}

export async function fetchArcades(game: Game): Promise<CloudFlareResponse> {
    const response = await fetch(`${API_URL}/api/arcades.php?action=query&series_id=${game}&game_name=&name=&skip_machines=1&skip_pictures=1&skip_visitors=1&skip_comments=1`);
    return await response.json();
}