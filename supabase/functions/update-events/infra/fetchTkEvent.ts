import { TkFullEvent } from "../domain/TkEvent.ts";

// Fetch detailed event data from the API
export async function fetchTkEventDetails(id: string) {
  const response = await fetch(
    `https://kasour.tamm-kreiz.bzh/app/getevent.php?id=${id}`
  );
  const data = await response.json();
  return data.evenement as TkFullEvent;
}
