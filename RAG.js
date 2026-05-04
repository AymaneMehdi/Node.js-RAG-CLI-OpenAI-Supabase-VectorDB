// ==========================
// STEP 0: IMPORTS
// ==========================

// Load environment variables from .env
import "dotenv/config";

// OpenAI SDK for embeddings + LLM
import OpenAI from "openai";

// File system to read docs.txt
import fs from "fs";

// CLI input/output
import readline from "readline";

// Supabase client
import { createClient } from "@supabase/supabase-js";


// ==========================
// STEP 1: CREATE CLIENTS
// ==========================

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);


// ==========================
// STEP 2: FILE PATH
// ==========================

const DOCS_FILE = "docs.txt";


// ==========================
// STEP 3: CREATE EMBEDDING FUNCTION
// ==========================

// This function converts text into embedding numbers
async function createEmbedding(text) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
}


// ==========================
// STEP 4: SPLIT DOCUMENT INTO CHUNKS
// ==========================

// This function reads docs.txt and splits it into small parts
function loadAndSplitDocs() {
  const documentText = fs.readFileSync(DOCS_FILE, "utf-8");

  const chunks = documentText
    .split(".")
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  return chunks;
}


// ==========================
// STEP 5: INSERT DOCUMENTS INTO SUPABASE
// ==========================

// This function is for the first run only.
// It creates embeddings and saves them in Supabase.
async function insertDocuments() {
  const chunks = loadAndSplitDocs();

  for (const chunk of chunks) {
    const embedding = await createEmbedding(chunk);

    const { error } = await supabase.from("documents").insert({
      content: chunk,
      embedding: embedding,
    });

    if (error) {
      console.error("Insert error:", error.message);
      continue;
    }

    console.log("Inserted:", chunk);
  }

  console.log("✅ Documents inserted into Supabase.");
}


// ==========================
// STEP 6: SEARCH DOCUMENTS IN SUPABASE
// ==========================

// This function searches similar chunks in Supabase.
// Supabase does the vector comparison internally.
async function searchDocuments(question) {
  const questionEmbedding = await createEmbedding(question);

  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: questionEmbedding,
    match_count: 3,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}


// ==========================
// STEP 7: ASK QUESTION FROM CLI
// ==========================

function askQuestion() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("Ask a question: ", (question) => {
      rl.close();
      resolve(question);
    });
  });
}


// ==========================
// STEP 8: GENERATE ANSWER WITH LLM
// ==========================

async function generateAnswer(question, context) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content:
          "Answer ONLY using the provided context. If the answer is not in the context, say you don't know.",
      },
      {
        role: "user",
        content: `
Context:
${context}

Question:
${question}
        `,
      },
    ],
  });

  return completion.choices[0].message.content;
}


// ==========================
// STEP 9: MAIN APP
// ==========================

async function main() {
  // IMPORTANT:
  // Run this line only one time to insert docs into Supabase.
  // After first run, comment it again to avoid duplicate data.

  // await insertDocuments();

  // Ask user question from terminal
  const question = await askQuestion();

  // Search relevant chunks in Supabase
  const results = await searchDocuments(question);

  // Build context from retrieved chunks
  const context = results.map((item) => item.content).join("\n");

  // Generate final answer using LLM
  const answer = await generateAnswer(question, context);

  // Print answer
  console.log("\nAnswer:");
  console.log(answer);
}


// ==========================
// STEP 10: RUN APP
// ==========================

main();