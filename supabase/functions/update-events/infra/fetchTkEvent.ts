import { LogError } from "../utils/logError.ts";
import { TkFullEvent } from "./TkEvent.ts";

// Fetch detailed event data from the API
export async function fetchTkEventDetails(
  id: number | string
): Promise<TkFullEvent> {
  const response = await fetch(
    `https://kasour.tamm-kreiz.bzh/app/v4/getevent.php?id=${id}`
  );
  const data = await response.json();

  if (data.message)
    throw new LogError(`Invalid Tk Event ${id}: ${data.message}`);

  return data as TkFullEvent;
}
