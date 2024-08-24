import { TkArtist } from "./TkArtist.ts";
import { TkOrganizer } from "./TkOrganizer.ts";

export type TkShortEvent = {
  eve_id: string;
  eve_datemaj: string;
  eve_date: string;
};

export type TkFullEvent = {
  date: string;
  eve_prix: string;
  heure: string;
  id: string;
  type: string;
  libelle: string;
  ville: string;
  latitude: string;
  longitude: string;
  departement: string;
  codepays: string;
  nompays: string;
  place: string;
  adresse1: string;
  adresse2: string;
  infos: string;
  place_latitude: string;
  place_longitude: string;
  prix_fr: string;
  artistes: TkArtist[];
  organisateurs: TkOrganizer[];
};
