export type TkArtist = {
  id: string; // can be -1 as number also, but it is parsed by parseInt correctly
  lenom: string;
  type?: string;
  contact?: string;
  site?: string;
  soundcloud?: string;
  facebook?: string;
  membres?: { id: string; nom: string; depuis: string; role: string }[];
};
