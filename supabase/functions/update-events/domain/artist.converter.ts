import { SpArtist } from "./SpArtist.ts";
import { TkArtist } from "./TkArtist.ts";

export const convertArtist = (artist: TkArtist): SpArtist => ({
  id: parseInt(artist.id),
  name: artist.lenom,
});
