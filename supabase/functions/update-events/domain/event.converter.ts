import { parseDate } from "../utils/parseDate.ts";
import { SpEvent } from "./SpEvent.ts";
import { TkFullEvent } from "./TkEvent.ts";

export const convertEvent = (
  fullEvent: TkFullEvent,
  categoryId: number
): SpEvent => ({
  id: parseInt(fullEvent.id),
  last_update: fullEvent.datemaj,
  date: parseDate(fullEvent.date, fullEvent.heure),
  description: fullEvent.libelle,
  price: fullEvent.prix_fr,
  town: fullEvent.ville,
  town_latitude: parseFloat(fullEvent.latitude),
  town_longitude: parseFloat(fullEvent.longitude),
  department: fullEvent.departement,
  place: fullEvent.place,
  place_address: fullEvent.adresse1,
  place_latitude: fullEvent.place_latitude
    ? parseFloat(fullEvent.place_latitude)
    : parseFloat(fullEvent.latitude),
  place_longitude: fullEvent.place_longitude
    ? parseFloat(fullEvent.place_longitude)
    : parseFloat(fullEvent.longitude),
  country_code: fullEvent.codepays,
  country_name: fullEvent.nompays,
  category_id: categoryId,
});
