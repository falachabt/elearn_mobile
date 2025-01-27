/// <reference types="https://deno.land/x/deno@v1.14.0/types.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.0";


console.log("Hello from Functions!");
console.log(Deno.env.get("_SUPABASE_URL"));
console.log(Deno.env.get("_SUPABASE_SERVICE_KEY"));


const supUrl = Deno.env.get("_SUPABASE_URL") as string;
const supKey = Deno.env.get("_SUPABASE_SERVICE_KEY") as string;
const supabase = createClient("https://yhznbitjlzeslvudbsil.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inloem5iaXRqbHplc2x2dWRic2lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNDIwNjg4NSwiZXhwIjoyMDM5NzgyODg1fQ.jc7SBQpuwVoxvQmo6tNrPWBjtm44fse5-RQcv2HCgww");

console.log("Hello from Functions!");
serve(async (req: Request) => {
  console.log("heer")
  let { data: posts, error } = await supabase.from("accounts").select();

  console.log(posts);
  if (error) {
    console.error(error);
  }
  return new Response(JSON.stringify(posts))
});