// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { TkFullEvent, TkShortEvent } from "./domain/TkEvent.ts";
import { fetchEventDetails } from "./infra/fetchEvent.ts";
import { fetchEvents } from "./infra/fetchEvents.ts";
import { TkArtist } from "./domain/TkArtist.ts";
import { TkOrganizer } from "./domain/TkOrganizer.ts";
import { LogError } from "./utils/logError.ts";
import { JSONResponse } from "./utils/jsonResponse.ts";
import { parseDate } from "./utils/parseDate.ts";

// This function serves as the main entry point for the Supabase Edge Function
Deno.serve(async () => {
  try {
    // Initialize the Supabase client using the environment variables
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Fetch the list of events from the external API
    const events = await fetchEvents();
    events.slice(0, 200).forEach(async (event, i) => {
      if (i % 20 == 0)
        console.info(`Processing event ${i + 1} of ${events.length}`);
      await checkAndUpdateEvent(event, supabase);
    });

    // Return a success response
    return new JSONResponse({ message: "Events processed successfully" });
  } catch (err) {
    // Return an error response in case of failure
    return new Response(String(err?.message ?? err), { status: 500 });
  }
});

// Check if event exists and is updated
async function checkAndUpdateEvent(
  event: TkShortEvent,
  supabase: SupabaseClient
) {
  const id = event.eve_id;
  const lastUpdate = new Date(event.eve_datemaj);

  const { data, error } = await supabase
    .from("Event")
    .select("id, last_update")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new LogError(`Error fetching event with ID ${id}:`, error);

  if (!data || lastUpdate > new Date(data.last_update)) {
    // Fetch event details
    const details = await fetchEventDetails(id);
    await saveEvent(details, supabase);
  }
}

// Save event details to the database
async function saveEvent(event: TkFullEvent, supabase: SupabaseClient) {
  const { error: eventError } = await supabase.from("Event").upsert({
    id: parseInt(event.id),
    last_update: new Date(),
    date: parseDate(event.date, event.heure),
    description: event.libelle,
    price: event.prix_fr,
    town: event.ville,
    town_latitude: parseFloat(event.latitude),
    town_longitude: parseFloat(event.longitude),
    departement: event.departement,
    place: event.place,
    place_address: event.adresse1,
    place_latitude: parseFloat(event.place_latitude),
    place_longitude: parseFloat(event.place_longitude),
    country_code: event.codepays,
    country_name: event.nompays,
    category_id: await getCategoryId(event.type, supabase),
  });

  if (eventError)
    throw new LogError(
      `Error upserting event with ID ${event.id}:`,
      eventError
    );

  await saveArtists(event.id, event.artistes, supabase);
  await saveOrganizers(event.id, event.organisateurs, supabase);
}

// Get or insert a category and return its ID
async function getCategoryId(category: string, supabase: SupabaseClient) {
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

    return insertData.id;
  }

  return data.id;
}

// Save associated artists in the database
async function saveArtists(
  eventId: string,
  artists: TkArtist[],
  supabase: SupabaseClient
) {
  for (const artistWrapper of artists) {
    const artist = artistWrapper.artiste;

    const { error } = await supabase
      .from("Artist")
      .upsert({ id: parseInt(artist.id), name: artist.lenom });

    if (error)
      throw new LogError(`Error upserting artist with ID ${artist.id}:`, error);

    const { error: participationError } = await supabase
      .from("ArtistParticipation")
      .upsert({ event_id: parseInt(eventId), artist_id: parseInt(artist.id) });

    if (participationError)
      throw new LogError(
        `Error upserting artist participation for event ${eventId} and artist ${artist.id}:`,
        participationError
      );
  }
}

// Save associated organizers in the database
async function saveOrganizers(
  eventId: string,
  organizers: TkOrganizer[],
  supabase: SupabaseClient
) {
  for (const organizerWrapper of organizers) {
    const organizer = organizerWrapper.organisateur;

    const { error } = await supabase.from("Organizer").upsert({
      id: parseInt(organizer.id),
      name: organizer.libelle,
      website: organizer.site,
      phone: organizer.afftelephone == "1" ? organizer.telephone : "",
      cell_phone: organizer.affmobile == "1" ? organizer.mobile : "",
      email: organizer.affemail == "1" ? organizer.email : "",
    });

    if (error)
      throw new LogError(
        `Error upserting organizer with ID ${organizer.id}:`,
        error
      );

    const { error: eventOrganizerError } = await supabase
      .from("EventOrganizer")
      .upsert({
        event_id: parseInt(eventId),
        organizer_id: parseInt(organizer.id),
      });

    if (eventOrganizerError)
      throw new LogError(
        `Error upserting event organizer for event ${eventId} and organizer ${organizer.id}:`,
        eventOrganizerError
      );
  }
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:
  curl -i --location --request POST "$SUPABASE_URL/functions/v1/update-events"

  3. Check results:
  curl "$SUPABASE_URL/rest/v1/Event?select=*" -H "apikey: $SUPABASE_ANON_KEY"
*/
