# Node.js RAG CLI with OpenAI & Supabase

A powerful **Retrieval-Augmented Generation (RAG)** system built with Node.js that leverages **Supabase as a vector database** and OpenAI's language models to answer questions based on your own documents.

This CLI application demonstrates how to combine local documents with OpenAI's embeddings and GPT models to create an intelligent question-answering system backed by persistent cloud storage.

## What is RAG?

**Retrieval-Augmented Generation (RAG)** is a technique that enhances Large Language Models (LLMs) by:
1. **Retrieving** relevant information from a knowledge base first
2. **Using** that information as context
3. **Generating** accurate answers based on that context

Instead of relying solely on the LLM's training data, RAG retrieves specific, relevant information and feeds it to the model, resulting in more accurate and grounded answers.

---

## How It Works: The RAG Pipeline

The system follows this workflow:

### **Step 1: Load**
- Read your document(s) from `docs.txt`
- The system loads all the text data into memory

### **Step 2: Split**
- Break the document into smaller, manageable **chunks**
- Chunks are split by periods (`.`) to create meaningful sentences/paragraphs
- Example: `"Hello. World."` → `["Hello", "World"]`

### **Step 3: Embed**
- Convert each chunk into a numerical representation called an **embedding**
- An embedding is a vector of numbers that represents the semantic meaning of the text
- Uses OpenAI's `text-embedding-3-small` model
- Stores embeddings in **Supabase Vector Database** for persistent storage

### **Step 4: User Question**
- User asks a question via the CLI
- The system waits for input

### **Step 5: Embed Question**
- Convert the user's question into an embedding using the same model
- Now the question and chunks are in the same numerical space

### **Step 6: Vector Search**
- Use Supabase's vector similarity search to compare the question embedding with all chunk embeddings
- Supabase performs the comparison using cosine similarity internally
- Find the top matching chunks (most relevant to the question)

### **Step 7: Retrieve**
- Extract the best matching chunks (default: top 3)
- Combine them into a context string
- This context contains the most relevant information for the question

### **Step 8: Generate**
- Send the context + question to GPT-4 mini
- The LLM reads the context and generates an accurate answer
- The system is instructed to: *"Answer ONLY using the provided context"*

### **Step 9: Return Answer**
- Display the generated answer to the user
- Close the CLI

---

## Visual Pipeline

```
docs.txt
   ↓
[Load] → Raw document text
   ↓
[Split] → Chunks: ["chunk1", "chunk2", ...]
   ↓
[Embed] → Create embeddings using OpenAI
   ↓
[Store] → Save to Supabase Vector Database
   ↓
User asks: "What is X?"
   ↓
[Embed Question] → Question embedding
   ↓
[Vector Search] → Supabase similarity search
   ↓
[Retrieve] → Top 3 relevant chunks (context)
   ↓
[Generate] → Send to GPT-4 mini with context
   ↓
LLM Answer
```

---

## Getting Started

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **OpenAI API Key** (get one at https://platform.openai.com/api-keys)
- **Supabase Account** (get one at https://supabase.com)
- **Supabase Project** with a `documents` table and vector search enabled

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/AymaneMehdi/Node.js-RAG-CLI-OpenAI-Supabase-VectorDB.git
cd Node.js-RAG-CLI-OpenAI-Supabase-VectorDB
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Set Up Supabase

1. Create a new project on [Supabase](https://supabase.com)
2. Run the following SQL in your Supabase SQL Editor to set up the vector database:

```sql
create extension if not exists vector;

create table documents (
  id bigint generated always as identity primary key,
  content text,
  embedding vector(1536)
);

create or replace function match_documents (
  query_embedding vector(1536),
  match_count int
)
returns table (
  id bigint,
  content text,
  similarity float
)
language sql
as $$
  select
    id,
    content,
    1 - (embedding <=> query_embedding) as similarity
  from documents
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

3. Enable Row Level Security (RLS) if needed, or allow public access for testing

#### 4. Create a `.env` File

```bash
cat > .env << EOF
OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
EOF
```

Replace placeholders with your actual credentials:
- `OPENAI_API_KEY`: Your OpenAI API key
- `SUPABASE_URL`: Your Supabase project URL (e.g., https://xxxxx.supabase.co)
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key (found in Supabase dashboard)

#### 5. Create a `docs.txt` File (Your Knowledge Base)

```bash
# Add your documents/data to docs.txt
# Example:
# "The Earth orbits the Sun. The Sun is a star. Stars are massive celestial bodies."
```

### Running the Application

#### First Time: Insert Documents

Before asking questions, you need to insert your documents into Supabase:

1. Open `RAG.js`
2. Find the `main()` function and uncomment this line:
   ```javascript
   await insertDocuments();
   ```
3. Run:
   ```bash
   node RAG.js
   ```
4. Wait for all documents to be inserted and embedded
5. Comment out the `insertDocuments()` line again to prevent duplicates

#### Ask Questions

```bash
node RAG.js
```

You'll see a prompt:
```
Ask a question: 
```

Type your question and press Enter. The system will:
1. Convert your question to an embedding
2. Search Supabase for relevant chunks
3. Send context to the LLM
4. Display the answer

**Example:**
```
Ask a question: What orbits the Sun?
Answer:
The Earth orbits the Sun.
```

---

## Project Structure

```
Node.js-RAG-CLI-OpenAI-Supabase-VectorDB/
├── RAG.js                # Main application file
├── package.json          # Project dependencies and metadata
├── package-lock.json     # Locked dependency versions
├── docs.txt              # Your knowledge base (create this)
├── .gitignore            # Git ignore rules
├── LICENSE               # ISC License
└── SECURITY.md           # Security guidelines
```

**Files to Create:**
- `docs.txt` - Add your knowledge base/documents here
- `.env` - Store your credentials here (keep secret)
- `.env.example` - Optional template for reference

---

## How the Code Works

### Key Components

| Component | Purpose |
|-----------|---------|
| **createEmbedding()** | Converts text to a vector using OpenAI's embedding model |
| **loadAndSplitDocs()** | Reads `docs.txt` and splits it into chunks |
| **insertDocuments()** | Creates embeddings and stores them in Supabase (run once) |
| **searchDocuments()** | Queries Supabase for similar chunks using vector search |
| **generateAnswer()** | Sends context + question to GPT-4 mini for answer generation |
| **askQuestion()** | CLI interface for user input using readline |

### Important Variables

- `documentText` - The raw content from `docs.txt`
- `chunks` - Text split into smaller pieces
- `embedding` - Vector representation of text (1536 dimensions)
- `questionEmbedding` - Embedding of user's question
- `results` - Top 3 matching chunks from Supabase
- `context` - Combined relevant text sent to LLM

---

**System Process:**
1. Embeds question: "Which planet is closest to the Sun?"
2. Searches Supabase for similar chunks
3. Finds best match: "Mercury is the closest to the Sun."
4. Sends to LLM with context
5. Returns answer: "Mercury is the closest planet to the Sun."

---

## Configuration

### Adjustable Parameters (in `RAG.js`)

- **Chunk split method:** Change `.split(".")` to use different delimiters (line 55)
- **Top results:** Change `match_count: 3` to retrieve more/fewer chunks (line 113)
- **Embedding model:** Change `text-embedding-3-small` to other OpenAI models (line 43)
- **LLM model:** Change `gpt-4.1-mini` to use different models (line 129)
- **System prompt:** Modify the system message to change answer behavior (line 132-134)

### Example: Get Top 5 Results Instead of 3

```javascript
// In the searchDocuments function, change this line:
match_count: 3,  // Get 3 results

// To:
match_count: 5,  // Get 5 results
```

---

## Tips & Best Practices

1. **Document Quality:** Better documents = better answers. Keep `docs.txt` organized and relevant.

2. **Chunk Size:** Smaller chunks improve matching precision but may lose context. Experiment with split methods.

3. **Context Length:** More context (more chunks) gives better answers but uses more tokens and costs more.

4. **System Prompt:** The system message is crucial—it instructs the LLM to stay within bounds and only use provided context.

5. **API Costs:** Each embedding call and LLM call costs money. Monitor your usage at:
   - OpenAI: https://platform.openai.com/account/billing/overview
   - Supabase: https://supabase.com/dashboard

6. **Vector Database:** Supabase handles vector storage and similarity search efficiently, scaling better than in-memory solutions.

7. **Re-embedding:** If you update `docs.txt`, run `insertDocuments()` again to add new embeddings.

---

## Security

- **Never commit `.env` to Git.** Add it to `.gitignore`:
  ```
  .env
  .env.local
  node_modules/
  ```

- Keep your OpenAI API key private

- Keep your Supabase credentials secure

- Don't share your `.env` file with others

- Consider using Row Level Security (RLS) on Supabase for production

- Refer to [SECURITY.md](SECURITY.md) for detailed security guidelines

---

## Dependencies

- **[openai](https://www.npmjs.com/package/openai)** - Official OpenAI Node.js SDK
- **[dotenv](https://www.npmjs.com/package/dotenv)** - Load environment variables from `.env` file
- **[@supabase/supabase-js](https://www.npmjs.com/package/@supabase/supabase-js)** - Supabase JavaScript client

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `docs.txt not found` | Create a `docs.txt` file in the project root with your documents |
| `OPENAI_API_KEY is undefined` | Check your `.env` file and ensure the key is set correctly |
| `SUPABASE_URL or SUPABASE_ANON_KEY is undefined` | Add both Supabase credentials to your `.env` file |
| `documents table not found` | Create the `documents` table in Supabase using the SQL provided in Installation step 3 |
| `match_documents function not found` | Create the `match_documents` function using the SQL provided in Installation step 3 |
| `Model not found` | Verify you're using a valid OpenAI model name (e.g., `gpt-4.1-mini`, `gpt-4`, `gpt-3.5-turbo`) |
| `No relevant results` | Your question might not match the document content; try different wording or add more documents |
| `Duplicate embeddings in Supabase` | You ran `insertDocuments()` multiple times. Clear the `documents` table and run once more |
| `Slow performance` | Large documents take longer to embed. Consider splitting `docs.txt` into smaller chunks or running in batches |
| `Permission denied on Supabase` | Check your Row Level Security (RLS) policies or disable RLS for testing |

---

## Learn More

- [OpenAI Embeddings Documentation](https://platform.openai.com/docs/guides/embeddings)
- [OpenAI Chat Completions](https://platform.openai.com/docs/guides/gpt)
- [Supabase Vector Documentation](https://supabase.com/docs/guides/ai/vector-columns)
- [RAG Concept on Wikipedia](https://en.wikipedia.org/wiki/Retrieval-augmented_generation)
- [Cosine Similarity](https://en.wikipedia.org/wiki/Cosine_similarity)

---

## License

This project is licensed under the [ISC License](LICENSE).

---

**Copyright © 2026 Aymane Mehdi**

For questions, issues, or contributions, please visit the [GitHub repository](https://github.com/AymaneMehdi/Node.js-RAG-CLI-OpenAI-Supabase-VectorDB).
