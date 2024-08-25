import { TkArtist } from "../infra/TkArtist.ts";
import { hashString } from "../utils/hashString.ts";
import { SpArtist } from "./SpArtist.ts";

export const convertArtist = (artist: TkArtist): SpArtist => ({
  id: artist.id === -1 ? hashString(artist.lenom) : parseInt(artist.id),
  name: artist.lenom,
  website: artist.site ?? "",
  soundcloud: artist.soundcloud ?? "",
  facebook: artist.facebook ?? "",
  members: artist.membres?.map((member) => member.nom) ?? [],
});
