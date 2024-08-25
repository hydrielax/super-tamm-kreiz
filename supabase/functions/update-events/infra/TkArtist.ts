export type TkArtist = {
  id: string | -1;
  lenom: string;
  type?: string;
  contact?: string;
  site?: string;
  soundcloud?: string;
  facebook?: string;
  membres?: { id: string; nom: string; depuis: string; role: string }[];
};
