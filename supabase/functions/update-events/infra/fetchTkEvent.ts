import { TkFullEvent } from "../domain/TkEvent.ts";

// Fetch detailed event data from the API
export async function fetchTkEventDetails(
  id: number | string
): Promise<TkFullEvent> {
  const response = await fetch(
    `https://kasour.tamm-kreiz.bzh/app/v4/getevent.php?id=${id}`
  );
  const data = await response.json();
  return data as TkFullEvent;
}
