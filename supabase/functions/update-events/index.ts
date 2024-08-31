/**
 * This script fetches events from the Tamm Kreiz API and updates the Supabase database.
 *
 * The Supabase database is used as Backend-for-Frontend (BFF) to serve the mobile app.
 */

// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { TkFullEvent, TkShortEvent } from "./infra/TkEvent.ts";
import { fetchTkEventDetails } from "./infra/fetchTkEvent.ts";
import { fetchTkEvents } from "./infra/fetchTkEvents.ts";
import { LogError } from "./utils/logError.ts";
import { JSONResponse } from "./utils/jsonResponse.ts";
import { convertOrganizer } from "./domain/organizer.converter.ts";
import { convertArtist } from "./domain/artist.converter.ts";
import { convertEvent } from "./domain/event.converter.ts";
import { SpArtist } from "./domain/SpArtist.ts";
import { SpOrganizer } from "./domain/SpOrganizer.ts";
import { SpEvent } from "./domain/SpEvent.ts";
import { hashString } from "./utils/hashString.ts";

// Main entry point for the Supabase Edge Function
Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const tkEvents = await fetchTkEvents();
    console.info(`Fetched ${tkEvents.length} events from Tamm Kreiz`);

    const spEvents = await fetchSpEvents(supabase);
    const eventsToUpdate = getEventsToUpdate(tkEvents, spEvents).slice(0, 100);
    console.log(`Updating or creating ${eventsToUpdate.length} events`);
    await processEvents(eventsToUpdate, supabase);

    return new JSONResponse({
      message: `${eventsToUpdate.length} events processed successfully`,
    });
  } catch (err) {
    return new Response(String(err?.message ?? err), { status: 500 });
  }
});

// Fetch existing events from the database
const fetchSpEvents = async (supabase: SupabaseClient) => {
  const { data, error } = await supabase
    .from("Event")
    .select("id, last_update");

  if (error) throw new LogError("Error fetching existing events:", error);
  return new Map<number, string>(
    data.map((event: Pick<SpEvent, "id" | "last_update">) => [
      event.id,
      event.last_update,
    ])
  );
};

// Determine which events need to be updated
const getEventsToUpdate = (
  tkEvents: TkShortEvent[],
  supabaseEvents: Map<number, string>
) => {
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  return tkEvents.filter((event) => {
    const tkLastUpdate = event.eve_datemaj;
    const spLastUpdate = supabaseEvents.get(parseInt(event.eve_id));
    return (
      (!spLastUpdate || tkLastUpdate > spLastUpdate) &&
      new Date(event.eve_date) > lastMonth // fetch only new events
    );
  });
};

// Process events in batches
const processEvents = async (
  events: TkShortEvent[],
  supabase: SupabaseClient
) => {
  // fetch all events by batch of 20 to avoid hitting the API rate limit
  const eventDetailsList: TkFullEvent[] = [];
  for (let i = 0; i < events.length; i += 20) {
    const batch = events.slice(i, i + 20);
    const batchDetails = await Promise.all(
      batch.map((event) => fetchTkEventDetails(event.eve_id))
    );
    eventDetailsList.push(...batchDetails);
  }

  const {
    eventsData,
    artistsData,
    organizersData,
    artistParticipationsData,
    eventOrganizersData,
  } = eventDetailsList.reduce(aggregateEventData, createEmptyData());

  // Upsert events, artists, and organizers
  const entityTablesResults = await Promise.all([
    supabase.from("Event").upsert(eventsData).select(),
    supabase.from("Artist").upsert(Array.from(artistsData.values())).select(),
    supabase
      .from("Organizer")
      .upsert(Array.from(organizersData.values()))
      .select(),
  ]);
  if (entityTablesResults.some(({ error }) => error)) {
    throw new LogError(
      "Error upserting events, artists, or organizers",
      entityTablesResults.find(({ error }) => error)?.error ?? undefined
    );
  }

  // Upsert artist participations and event organizers
  const associationTablesResults = await Promise.all([
    supabase
      .from("ArtistParticipation")
      .upsert(artistParticipationsData)
      .select(),
    supabase.from("EventOrganizer").upsert(eventOrganizersData).select(),
  ]);
  if (associationTablesResults.some(({ error }) => error)) {
    throw new LogError(
      "Error upserting artist participations or event organizers",
      associationTablesResults.find(({ error }) => error)?.error ?? undefined
    );
  }
};

// Aggregate event data using a reducer function
const aggregateEventData = (
  buffer: {
    eventsData: SpEvent[];
    artistsData: Map<number, SpArtist>;
    organizersData: Map<number, SpOrganizer>;
    artistParticipationsData: { artist_id: number; event_id: number }[];
    eventOrganizersData: { organizer_id: number; event_id: number }[];
  },
  event: TkFullEvent
) => {
  buffer.eventsData.push(convertEvent(event));

  event.artistes.forEach((artist) => {
    const artistId =
      artist.id === -1 ? hashString(artist.lenom) : parseInt(artist.id);
    if (!buffer.artistsData.has(artistId)) {
      buffer.artistsData.set(artistId, convertArtist(artist));
    }
    buffer.artistParticipationsData.push(
      createArtistParticipationData(event.id, artistId)
    );
  });

  event.organisateurs.forEach((organizer) => {
    if (!buffer.organizersData.has(parseInt(organizer.id))) {
      buffer.organizersData.set(
        parseInt(organizer.id),
        convertOrganizer(organizer)
      );
    }
    buffer.eventOrganizersData.push(
      createEventOrganizerData(event.id, organizer.id)
    );
  });

  return buffer;
};

// Initialize empty data structures
const createEmptyData = () => ({
  eventsData: new Array<SpEvent>(),
  artistsData: new Map<number, SpArtist>(),
  organizersData: new Map<number, SpOrganizer>(),
  artistParticipationsData: new Array<{
    artist_id: number;
    event_id: number;
  }>(),
  eventOrganizersData: new Array<{ organizer_id: number; event_id: number }>(),
});

const createArtistParticipationData = (eventId: string, artistId: number) => ({
  event_id: parseInt(eventId),
  artist_id: artistId,
});

const createEventOrganizerData = (eventId: string, organizerId: string) => ({
  event_id: parseInt(eventId),
  organizer_id: parseInt(organizerId),
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:
  curl -i --location --request POST "$SUPABASE_URL/functions/v1/update-events"

  3. Check results:
  curl "$SUPABASE_URL/rest/v1/Event?select=*" -H "apikey: $SUPABASE_ANON_KEY"
*/
