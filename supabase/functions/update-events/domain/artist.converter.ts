import { TkArtist } from "../infra/TkArtist.ts";
import { SpArtist } from "./SpArtist.ts";

export const convertArtist = (artist: TkArtist): SpArtist => ({
  id: parseInt(artist.id),
  name: artist.lenom,
});
