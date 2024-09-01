import { TkOrganizer } from "../infra/TkOrganizer.ts";
import { SpOrganizer } from "./SpOrganizer.ts";

export const convertOrganizer = (organizer: TkOrganizer): SpOrganizer => ({
  id: parseInt(organizer.id),
  name: organizer.libelle,
  website: organizer.site ?? "",
  phone_1: organizer.telephone ?? "",
  phone_2: organizer.mobile ?? "",
  email: organizer.email ?? "",
  image_url: `https://www.tamm-kreiz.bzh/vuhez/media/annuaire/bihan/${organizer.id}b.jpg`,
});
