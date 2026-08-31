// scripts/seed_fake_feed.ts
import { supabase } from "../lib/supabase";

async function main() {
  // 1️⃣ Ensure a test user exists (service role is required for admin API)
  const testEmail = "test@example.com";
  const { data: existingUser, error: fetchErr } = await supabase
    .from("auth.users")
    .select("id")
    .eq("email", testEmail)
    .single();

  let userId: string;
  if (existingUser) {
    userId = existingUser.id;
    console.log("✅ Test user already exists:", userId);
  } else {
    console.log("🔧 Creating test user …");
    const { data, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "Test1234!",
      email_confirm: true,
    });
    if (error) {
      throw new Error(`Failed to create test user: ${error.message}`);
    }
    userId = data.id;
    console.log("✅ Test user created:", userId);
  }

  // 2️⃣ Insert several fake posts (5)
  const posts = Array.from({ length: 5 }).map((_, i) => ({
    author_id: userId,
    content: `Post de test #${i + 1}`,
    media_urls: [] as string[],
  }));

  const { data: insertedPosts, error: postErr } = await supabase
    .from("feed_posts")
    .insert(posts)
    .select();
  if (postErr) throw postErr;
  console.log(`✅ Inserted ${insertedPosts.length} posts`);

  // 3️⃣ Insert 2‑4 comments per post
  for (const post of insertedPosts) {
    const commentCount = Math.floor(Math.random() * 3) + 2; // 2‑4 comments
    const comments = Array.from({ length: commentCount }).map(() => ({
      post_id: post.id,
      author_id: userId,
      content: "Commentaire de test",
    }));
    const { error: commentErr } = await supabase.from("post_comments").insert(comments);
    if (commentErr) throw commentErr;
    console.log(`✅ Added ${comments.length} comments to post ${post.id}`);
  }

  // 4️⃣ Randomly vote on up to 10 recent comments
  const { data: recentComments, error: commentFetchErr } = await supabase
    .from("post_comments")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(10);
  if (commentFetchErr) throw commentFetchErr;

  if (recentComments && recentComments.length > 0) {
    const votes = recentComments.map((c) => ({
      comment_id: c.id,
      user_id: userId,
      vote_type: Math.random() > 0.5 ? 1 : -1,
    }));
    const { error: voteErr } = await supabase.from("comment_votes").insert(votes);
    if (voteErr) throw voteErr;
    console.log(`✅ Inserted ${votes.length} votes`);
  }

  console.log("🚀 Seed data inserted successfully!");
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
});
