import { parseDate } from "../utils/parseDate.ts";
import { SpEvent } from "./SpEvent.ts";
import { TkFullEvent } from "./TkEvent.ts";

export const convertEvent = (event: TkFullEvent): SpEvent => ({
  id: parseInt(event.id),
  last_update: event.datemaj,
  date: parseDate(event.date, event.heure),
  description: event.libelle,
  price: event.prix_fr,
  town: event.ville,
  town_latitude: parseFloat(event.latitude),
  town_longitude: parseFloat(event.longitude),
  department: event.departement,
  place: event.place,
  place_address: event.adresse1,
  place_latitude: event.place_latitude
    ? parseFloat(event.place_latitude)
    : parseFloat(event.latitude),
  place_longitude: event.place_longitude
    ? parseFloat(event.place_longitude)
    : parseFloat(event.longitude),
  country_code: event.codepays,
  country_name: event.nompays,
  category: parseInt(event.dpr_id),
  sub_category: event.type,
});
