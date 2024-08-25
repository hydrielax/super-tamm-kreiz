import { TkShortEvent } from "../domain/TkEvent.ts";

// Fetch list of events from the external API
export async function fetchTkEvents() {
  const response = await fetch(
    "https://kasour.tamm-kreiz.bzh/app/getevents.php?type_periode=all"
  );
  const data = await response.json();
  return data.evenements as TkShortEvent[];
}
