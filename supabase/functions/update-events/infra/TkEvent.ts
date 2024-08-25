import { TkArtist } from "./TkArtist.ts";
import { TkOrganizer } from "./TkOrganizer.ts";

export type TkShortEvent = {
  eve_id: string;
  eve_datemaj: string;
  eve_date: string;
};

export type TkFullEvent = {
  date: string;
  datemaj: string;
  dpr_id: string; // 1=Fest-Noz/Diez, 3=Concert, 5=Bagad/Cercles celtiques
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
  couvert: boolean;
  parking: boolean;
  capacite: string;
  parquet: boolean;
  prix_fr: string;
  url_affiche: string;
  artistes: TkArtist[];
  organisateurs: TkOrganizer[];
};
