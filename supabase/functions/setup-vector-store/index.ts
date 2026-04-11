import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// This function has been decommissioned.
// The app now uses LM Studio (local AI) with the constitution bundled in
// src/data/constitution.ts — no external vector store is needed.
serve(() =>
  new Response(
    JSON.stringify({ error: "This endpoint has been removed." }),
    { status: 410, headers: { "Content-Type": "application/json" } },
  )
);
