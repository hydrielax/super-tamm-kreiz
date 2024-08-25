import { SpOrganizer } from "./SpOrganizer.ts";
import { TkOrganizer } from "./TkOrganizer.ts";

export const convertOrganizer = (organizer: TkOrganizer): SpOrganizer => ({
  id: parseInt(organizer.id),
  name: organizer.libelle,
  website: organizer.site,
  phone_1: organizer.telephone ?? "",
  phone_2: organizer.mobile ?? "",
  email: organizer.email ?? "",
});
