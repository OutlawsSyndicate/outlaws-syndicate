import { supabase } from "../../../lib/supabase";

export async function GET() {
  // Test inserting into inventory
  try {
    const { data, error } = await supabase
      .from("inventory")
      .insert({
        user_id: "test",
        user_name: "test",
        type: "ship",
        name: "Test Ship",
        manufacturer: "",
        category: "",
        image_url: null,
        quantity: 1,
        quality: 0,
        status: "available",
        assigned_to: "test",
        notes: "",
      })
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message, code: error.code, details: error.details, hint: error.hint });
    }

    // Clean up test row
    await supabase.from("inventory").delete().eq("id", data.id);

    return Response.json({ ok: true, testRow: data });
  } catch (err) {
    return Response.json({ error: err.message, stack: err.stack });
  }
}
