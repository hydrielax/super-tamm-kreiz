deploy:
	@echo "Deploying function"
	@supabase functions deploy update-events

test:
	@echo "Running function"
	source .env && curl -i --location --request POST "$${SUPABASE_URL}/functions/v1/update-events"

check:
	@echo "List all events"
	source .env && curl "$${SUPABASE_URL}/rest/v1/Event?select=*" -H "apikey: $${SUPABASE_ANON_KEY}"
