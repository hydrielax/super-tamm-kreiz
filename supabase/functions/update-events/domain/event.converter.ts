import { parseDate } from "../utils/parseDate.ts";
import { SpEvent } from "./SpEvent.ts";
import { TkFullEvent } from "../infra/TkEvent.ts";

export const convertEvent = (event: TkFullEvent): SpEvent => ({
  id: parseInt(event.id),
  last_update: event.datemaj,
  date: parseDate(event.date, event.heure),
  description: event.libelle,
  price: event.prix_fr != "inconnu" ? event.prix_fr : "",
  town: event.ville,
  town_latitude: parseFloat(event.latitude),
  town_longitude: parseFloat(event.longitude),
  department: event.departement ? parseInt(event.departement) : null,
  place: event.place,
  place_address: event.adresse1 + (event.adresse2 ? "\n" + event.adresse2 : ""),
  place_infos: event.infos,
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
  is_covered_place: event.couvert ?? false,
  has_car_park: event.parking ?? false,
  has_parquet_floor: event.parquet ?? false,
  booking_url: event.url_reservation || "",
  image_url: event.url_affiche || "",
  thumbnail_url: event.url_affiche
    ? `https://www.tamm-kreiz.bzh/vuhez/media/evenements/affiches_retaillees/${event.id}_300.png`
    : "",
  is_partner: event.avantage !== undefined,
  partner_advantage: event.avantage || "",
});
