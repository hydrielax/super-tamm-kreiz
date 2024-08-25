// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { TkFullEvent, TkShortEvent } from "./domain/TkEvent.ts";
import { fetchTkEventDetails } from "./infra/fetchTkEvent.ts";
import { fetchTkEvents } from "./infra/fetchTkEvents.ts";
import { TkArtist } from "./domain/TkArtist.ts";
import { TkOrganizer } from "./domain/TkOrganizer.ts";
import { LogError } from "./utils/logError.ts";
import { JSONResponse } from "./utils/jsonResponse.ts";
import { parseDate } from "./utils/parseDate.ts";

// Main entry point for the Supabase Edge Function
Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    console.info("Fetching events from Tamm-Kreiz API...");
    const tkEvents = await fetchTkEvents();
    console.info(`Fetched ${tkEvents.length} events`);

    console.info("Fetching existing events from the database...");
    const supabaseEvents = await fetchSupabaseEvents(supabase);
    console.info(`Fetched ${supabaseEvents.size} existing events`);

    console.info("Get events to update...");
    const eventsToUpdate = getEventsToUpdate(tkEvents, supabaseEvents).slice(
      0,
      50
    );
    console.info(`Events to update: ${eventsToUpdate.length}`);
    console.info("Processing events...");
    await processEvents(eventsToUpdate, supabase);
    console.info("Events processed successfully");

    return new JSONResponse({ message: "Events processed successfully" });
  } catch (err) {
    return new Response(String(err?.message ?? err), { status: 500 });
  }
});

// Fetch existing events from the database
const fetchSupabaseEvents = async (supabase: SupabaseClient) => {
  const { data, error } = await supabase
    .from("Event")
    .select("id, last_update");

  if (error) throw new LogError("Error fetching existing events:", error);
  return new Map<string, Date>(
    data.map((event) => [event.id, new Date(event.last_update)])
  );
};

// Determine which events need to be updated
const getEventsToUpdate = (
  tkEvents: TkShortEvent[],
  supabaseEvents: Map<string, Date>
) =>
  tkEvents.filter((event) => {
    const tkLastUpdate = new Date(event.eve_datemaj);
    const supabaseLastUpdate = supabaseEvents.get(event.eve_id);
    return !supabaseLastUpdate || tkLastUpdate > supabaseLastUpdate;
  });

// Process events in batches
const processEvents = async (
  events: TkShortEvent[],
  supabase: SupabaseClient
) => {
  const eventDetailsList = await Promise.all(
    events.map((event) => fetchTkEventDetails(event.eve_id))
  );

  const {
    eventsData,
    artistsData,
    organizersData,
    artistParticipationsData,
    eventOrganizersData,
  } = await eventDetailsList.reduce(
    aggregateEventData(supabase),
    Promise.resolve(createEmptyData())
  );

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
const aggregateEventData =
  (supabase: SupabaseClient) => async (acc: any, details: TkFullEvent) => {
    console.debug("Accumulator: ", acc);
    const categoryId = await getOrInsertCategory(
      details.type,
      supabase,
      acc.categoriesCache
    );

    acc.eventsData.push(createEventData(details, categoryId));

    details.artistes.forEach((artistWrapper) => {
      const artist = artistWrapper.artiste;
      if (!acc.artistsData.has(parseInt(artist.id))) {
        acc.artistsData.set(parseInt(artist.id), createArtistData(artist));
      }
      acc.artistParticipationsData.push(
        createArtistParticipationData(details.id, artist.id)
      );
    });

    details.organisateurs.forEach((organizerWrapper) => {
      const organizer = organizerWrapper.organisateur;
      if (!acc.organizersData.has(parseInt(organizer.id))) {
        acc.organizersData.set(
          parseInt(organizer.id),
          createOrganizerData(organizer)
        );
      }
      acc.eventOrganizersData.push(
        createEventOrganizerData(details.id, organizer.id)
      );
    });

    return acc;
  };

// Initialize empty data structures
const createEmptyData = () => ({
  eventsData: [],
  artistsData: new Map<number, { id: number; name: string }>(),
  organizersData: new Map<
    number,
    {
      id: number;
      name: string;
      website: string;
      phone: string;
      cell_phone: string;
      email: string;
    }
  >(),
  artistParticipationsData: [],
  eventOrganizersData: [],
  categoriesCache: new Map<string, number>(),
});

// Helper functions to create various entities
const createEventData = (details: TkFullEvent, categoryId: number) => ({
  id: parseInt(details.id),
  last_update: new Date(),
  date: parseDate(details.date, details.heure),
  description: details.libelle,
  price: details.prix_fr,
  town: details.ville,
  town_latitude: parseFloat(details.latitude),
  town_longitude: parseFloat(details.longitude),
  department: details.departement,
  place: details.place,
  place_address: details.adresse1,
  place_latitude: details.place_latitude
    ? parseFloat(details.place_latitude)
    : details.latitude,
  place_longitude: details.place_longitude
    ? parseFloat(details.place_longitude)
    : details.longitude,
  country_code: details.codepays,
  country_name: details.nompays,
  category_id: categoryId,
});

const createArtistData = (artist: TkArtist) => ({
  id: parseInt(artist.id),
  name: artist.lenom,
});

const createOrganizerData = (organizer: TkOrganizer) => ({
  id: parseInt(organizer.id),
  name: organizer.libelle,
  website: organizer.site,
  phone: organizer.afftelephone === "1" ? organizer.telephone : "",
  cell_phone: organizer.affmobile === "1" ? organizer.mobile : "",
  email: organizer.affemail === "1" ? organizer.email : "",
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
