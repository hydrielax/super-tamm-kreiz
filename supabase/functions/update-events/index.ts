// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { TkFullEvent, TkShortEvent } from "./domain/TkEvent.ts";
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

    return new JSONResponse({ message: "Events processed successfully" });
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
    data.map((event) => [event.id, event.last_update])
  );
};

// Determine which events need to be updated
const getEventsToUpdate = (
  tkEvents: TkShortEvent[],
  supabaseEvents: Map<number, string>
) =>
  tkEvents.filter((event) => {
    const tkLastUpdate = event.eve_datemaj;
    const spLastUpdate = supabaseEvents.get(parseInt(event.eve_id));
    return !spLastUpdate || tkLastUpdate > spLastUpdate;
  });

// Process events in batches
const processEvents = async (
  events: TkShortEvent[],
  supabase: SupabaseClient
) => {
  const eventDetailsList = await Promise.all(
    events.map((event) => fetchTkEventDetails(event.eve_id))
  );

  let buffer = createEmptyData();
  for (const event of eventDetailsList) {
    buffer = await aggregateEventData(supabase, buffer, event);
  }
  const {
    eventsData,
    artistsData,
    organizersData,
    artistParticipationsData,
    eventOrganizersData,
  } = buffer;

  // Upsert events, artists, and organizers
  await Promise.all([
    supabase.from("Event").upsert(eventsData),
    supabase.from("Artist").upsert(Array.from(artistsData.values())),
    supabase.from("Organizer").upsert(Array.from(organizersData.values())),
  ]);

  // Upsert artist participations and event organizers
  await Promise.all([
    supabase.from("ArtistParticipation").upsert(artistParticipationsData),
    supabase.from("EventOrganizer").upsert(eventOrganizersData),
  ]);
};

// Aggregate event data using a reducer function
const aggregateEventData = async (
  supabase: SupabaseClient,
  buffer: {
    eventsData: SpEvent[];
    artistsData: Map<number, SpArtist>;
    organizersData: Map<number, SpOrganizer>;
    artistParticipationsData: { artist_id: number; event_id: number }[];
    eventOrganizersData: { organizer_id: number; event_id: number }[];
    categoriesCache: Map<string, number>;
  },
  event: TkFullEvent
) => {
  const categoryId = await getOrInsertCategory(
    event.type,
    supabase,
    buffer.categoriesCache
  );

  buffer.eventsData.push(convertEvent(event, categoryId));

  event.artistes.forEach((artist) => {
    if (!buffer.artistsData.has(parseInt(artist.id))) {
      buffer.artistsData.set(parseInt(artist.id), convertArtist(artist));
    }
    buffer.artistParticipationsData.push(
      createArtistParticipationData(event.id, artist.id)
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
  categoriesCache: new Map<string, number>(),
});

const createArtistParticipationData = (eventId: string, artistId: string) => ({
  event_id: parseInt(eventId),
  artist_id: parseInt(artistId),
});

const createEventOrganizerData = (eventId: string, organizerId: string) => ({
  event_id: parseInt(eventId),
  organizer_id: parseInt(organizerId),
});

// Get or insert a category and return its ID
const getOrInsertCategory = async (
  category: string,
  supabase: SupabaseClient,
  categoriesCache: Map<string, number>
) => {
  if (categoriesCache.has(category)) return categoriesCache.get(category)!;

  const { data, error } = await supabase
    .from("EventCategory")
    .select("id")
    .eq("name", category)
    .maybeSingle();

  if (error) throw new LogError(`Error fetching category ${category}:`, error);

  if (!data) {
    const { data: insertData, error: insertError } = await supabase
      .from("EventCategory")
      .insert([{ name: category, type: "Fest-Noz et Fest-Deiz" }])
      .select("id")
      .single();

    if (insertError)
      throw new LogError(`Error inserting category ${category}:`, insertError);

    categoriesCache.set(category, insertData.id);
    return insertData.id as number;
  }

  categoriesCache.set(category, data.id);
  return data.id as number;
};

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:
  curl -i --location --request POST "$SUPABASE_URL/functions/v1/update-events"

  3. Check results:
  curl "$SUPABASE_URL/rest/v1/Event?select=*" -H "apikey: $SUPABASE_ANON_KEY"
*/
