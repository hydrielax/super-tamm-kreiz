import { TkArtist } from "../infra/TkArtist.ts";
import { hashString } from "../utils/hashString.ts";
import { SpArtist } from "./SpArtist.ts";

export const convertArtist = (artist: TkArtist): SpArtist => ({
  id: artist.id === -1 ? hashString(artist.lenom) : parseInt(artist.id),
  name: artist.lenom,
  website: artist.site ?? "",
  soundcloud: artist.soundcloud ?? "",
  facebook: artist.facebook ?? "",
  image_url: `http://www.tamm-kreiz.bzh/kalon/tk.php?action=ajax_photo&id=${artist.id}&f=1`,
  members: artist.membres?.map((member) => member.nom) ?? [],
});
