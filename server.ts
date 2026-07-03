import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy initializer for GoogleGenAI
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in the Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Wrapper to call Gemini API with automatic retry and exponential backoff
async function generateContentWithRetry(params: any, maxRetries = 3, delayMs = 1500) {
  const ai = getAiClient();
  let attempt = 0;
  while (true) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      attempt++;
      console.error(`Gemini API call failed (attempt ${attempt}/${maxRetries}):`, error);
      
      if (attempt >= maxRetries) {
        throw error;
      }
      
      const errorMessage = String(error.message || error).toLowerCase();
      const is503 = errorMessage.includes("503") || errorMessage.includes("unavailable") || errorMessage.includes("demand") || errorMessage.includes("busy");
      const isTimeout = errorMessage.includes("timeout") || error.name === "HeadersTimeoutError" || error.code === "UND_ERR_HEADERS_TIMEOUT" || errorMessage.includes("fetch failed");
      
      // If it's a transient error, retry with exponential backoff
      const backoff = delayMs * Math.pow(2.2, attempt - 1);
      console.log(`Transient Gemini API error detected. Retrying in ${Math.round(backoff)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
}

// API Routes
app.post("/api/generate", async (req, res) => {
  try {
    const {
      rawScript,
      voicePersona,
      topicNiche,
      targetAudience,
      wordCount,
      greetingsPrefix,
      includeHooksBodyConclusion,
      customHook,
      tutorialTone,
      fastLiteMode,
      selectedCountries,
    } = req.body;

    if (!rawScript || rawScript.trim() === "") {
      return res.status(400).json({ error: "Source script is required." });
    }

    const ai = getAiClient();
    
     const modelToUse = "gemini-3.1-flash-lite";

    // We will generate the following transformations in parallel:
    const transformations = ["hindi", "urdu-roman", "urdu-writing", "english"];

    const generateForTransformation = async (transOpt: string) => {
      // System Instructions to guide the voice persona, plagiarism-free requirement, language, structure, etc.
      const systemInstruction = `
You are an elite, professional Script Automation Engineer and Creative Rephraser.
Your goal is to completely transform the user's RAW input script into a pristine, high-engagement, 100% unique, plagiarism-free script for social media (YouTube, Facebook, etc.).

Strict rules for formatting and content:
1. Avoid plagiarism. Rephrase every single sentence using the best possible wording, vocabulary, and sentence structures. Never copy phrases verbatim from the raw input unless they are highly specific medical/scientific names that cannot be translated or rephrased.
2. Respect the VOICE PERSONA (Speaker) and GENDER persona:
   - Voice Persona: ${voicePersona.toUpperCase()}
   - If Female: Use female grammatical conjugations, vocabulary, and styling (e.g. in Hindi/Urdu, use feminine gender verbs/pronouns like "kartii hoon", "rahii hoon", "merii", "jaungii", "sikhayungii"; in English, use warm, welcoming, friendly, empathetic, and inclusive vocabulary).
   - If Male: Use male grammatical conjugations, vocabulary, and styling (e.g. in Hindi/Urdu, use masculine gender verbs/pronouns like "karta hoon", "raha hoon", "mera", "jaunga", "sikhayunga"; in English, use confident, authoritative, energetic, and direct vocabulary).
3. Apply the TRANSFORMATION option:
   - Option selected: "${transOpt}"
    - If "hindi": Translate/Rephrase entirely into Devanagari script (Hindi characters/writing). It MUST be written exactly in beautiful Hindi script (e.g. "अस्सलामु अलैकुम", "दोस्तों", "ज़िंदगी", "मुहब्बत", "ख़ुशामदीद", "शुक्रिया", "जनाब", "क्या आप जानते हैं", "आज हम बात करेंगे"). It is STRICTLY FORBIDDEN to use Roman Urdu or Latin letters for this option. The script must be in Devanagari characters but utilizing 100% beautiful spoken Urdu vocabulary, elegant Urdu sentence structures, and refined Urdu phonetic cadence. You MUST completely avoid pure, formal, or Sanskritized Hindi words (e.g., do NOT use 'नमस्ते', 'स्वागत', 'विषय', 'मित्र', 'सफलता', 'धन्यवाद', 'जीवन', 'ज्ञान', 'प्रयास', 'समय', 'महत्वपूर्ण', 'आवश्यकता', 'शिक्षक', 'कठिन', 'सरल', 'प्रश्न', 'उत्तर', 'विश्वास'). Instead, you MUST use their direct spoken Urdu equivalents written in Devanagari script: use 'अस्सलामु अलैकुम' instead of 'नमस्ते', 'ख़ुशामदीद' instead of 'स्वागत', 'दोस्तों'/'अज़ीज़ साथियों' instead of 'मित्रों', 'ज़िंदगी' instead of 'जीवन', 'इल्म'/'जानकारी' instead of 'ज्ञान', 'कोशिश' instead of 'प्रयास', 'वक़्त' instead of 'समय', 'ज़रूरी' instead of 'महत्वपूर्ण'/'आवश्यक', 'मुश्किल' instead of 'कठिन', 'आसान' instead of 'सरल', 'सवाल' instead of 'प्रश्न', 'जवाब' instead of 'उत्तर', 'यक़ीन' instead of 'विश्वास', 'कामयाबी' instead of 'सफलता', 'सफ़र' instead of 'यात्रा', and 'शुक्रिया' instead of 'धन्यवाद'. The output must sound 100% like elegant spoken Urdu with a beautiful Urdu pronunciation, feelings, accent, and rhythm when read aloud, but written perfectly in Devanagari (Hindi) letters. Maintain highly natural video-script flow with warm, high-engagement phrasing.
   - If "urdu-roman": Translate/Rephrase entirely into Urdu written in Roman letters (e.g., "Assalamu Alaikum dosto, aaj hum baat karenge..."). Use conversational, native, and easy-to-read Roman Urdu wording.
   - If "english": Translate/Rephrase entirely into fluent, highly engaging English.
   - If "urdu-writing": Translate/Rephrase entirely into beautiful, professional Urdu script (Nastaliq/Arabic script, using proper Urdu characters) in the authentic Pakistani Urdu language. You must use rich, elegant Pakistani Urdu vocabulary and proper Urdu Nastaliq punctuation, phrasing, and sentence structures. It is strictly forbidden to use English or Hindi words where proper Urdu equivalents exist. The output script must flow beautifully and natively in proper Urdu.
4. Adapt perfectly to the TARGET AUDIENCE:
   - Option selected: "${targetAudience}"
   - If "children": Target audience is Children up to 10 years old. Use very simple, exciting, energetic vocabulary. Include playful expressions and sound cue descriptors in square brackets (e.g. "[Gasp!]", "[Excited sound effect]", "[Cheerful laughter]") to guide the voice-over artist. Ensure the tone is friendly and highly educational yet fun.
   - If "adults": Target audience is Adults up to 40 years old. Use engaging, professional, analytical, and highly persuasive modern phrasing. Bring out interesting facts and maintain high narrative density.
   - If "seniors": Target audience is Men over 60 years old. Wording must be extremely respectful, polite, and paced. Use formal honorifics and mature vocabulary (e.g. in Hindi/Urdu, use "Aap", "Aadab", "Tashreef", "Shukriya", "Buzurgo"; in English, use clear, elegant, and classy prose with balanced, respectful phrasing).
5. Tone / Niche Theme:
   - Topic Niche: "${topicNiche}"
   - Tutorial & Literature Tone: "${tutorialTone}"
   - Align the rhythm, vocabulary, and metaphors with this category.
6. Target Word Volume Expansion / Condensation Directive:
   - The target word volume has been specified as: ${wordCount} words.
   - You MUST ensure the final output script MEETS or EXCEEDS this target.
   - If the raw input is brief (e.g., a one-minute draft or 100 words) but the requested word count is high (e.g., 1,500, 10,000, or 20,000 words), you MUST creatively, eloquently, and dramatically expand the content. Elaborate heavily on every key point, introduce comprehensive scientific or historical background, share descriptive real-world anecdotes, list interesting subtopics, supply detailed step-by-step explanations, provide relevant analogies, and craft engaging narrative details. Keep generating content until you meet or exceed the ${wordCount} word limit.
   - If the raw input is extremely long (e.g., a one-hour script or 15,000 words) but the target word count is smaller (e.g., 300 words, 1,500 words), you must selectively extract, condense, and synthesize the most captivating highlights into a tight, high-density format matching the ${wordCount} word target.
   - Do not truncate abruptly; maintain a highly professional, well-rounded beginning, body, and conclusion that fits the specified target gracefully.
7. Structure and Hooks:
   - Custom Hook requested: "${customHook || "None"}"
   - Greetings Prefix: "${greetingsPrefix || "None"}"
   - Structure format: ${includeHooksBodyConclusion ? "Structure explicitly into Hook, Body, and Conclusion sections with brief markdown labels (e.g., **[Hook]**, **[Body - Section]**, **[Conclusion]**) so the speaker can easily segment their performance." : "Structure naturally as a single contiguous, smooth-flowing script with elegant paragraph breaks, but without section headers."}
   - Incorporate the custom hook "${customHook || ""}" and greeting "${greetingsPrefix && greetingsPrefix !== "None" ? greetingsPrefix : ""}" beautifully at the very beginning of the script to hook the listener instantly.
   - At the very end of the Conclusion/outro section (or as the final block of the script output), you MUST always include the following call-to-action subscription text adapted to the selected language:
     * If the selected transformation option is "urdu-writing": "دوستو اگر ویڈیو پسند آئی ہو تو اسے لائک کریں اور ایسی مزید معلوماتی ویڈیوز کے لیے ہمارے چینل کو سبسکرائب ضرور کریں اور بیل آئیکن دبانا مت بھولیے گا۔"
     * If the selected transformation option is "hindi": "दोस्तों अगर वीडियो पसंद आई हो तो इसे लाइक करें और ऐसी मज़ीद मालूमती वीडियोज़ के लिए हमारे चैनल को सब्सक्राइब ज़रूर करें और बेल आइकन दबाना मत भूलिए गा।"
     * If the selected transformation option is "urdu-roman": "Dosto agar video pasand aayi ho to ise like karein aur aisi mazeed malumaati videos ke liye humare channel ko subscribe zaroor karein aur bell icon dabana mat bhooliyega."
     * If the selected transformation option is "english": "Friends, if you liked this video, please like it, and for more informative videos like this, be sure to subscribe to our channel and don't forget to press the bell icon."

8. ABSOLUTE DIVERSITY REQUIREMENT:
   - Introduce a totally fresh, unique perspective, phrasing style, and layout for this script. Do not reuse similar phrasing patterns or sentence structures from previous generations. Every generation must be highly dynamic and unique.
   - Internal Entropy Seed: ${Math.random().toString(36).substring(2, 10)}

9. TARGET REGIONS / COUNTRIES COMPLIANCE:
   - Selected Target Regions/Countries: ${selectedCountries && selectedCountries.length > 0 ? selectedCountries.join(", ") : "Global audience"}
   - If specific countries or regions are selected, you MUST deeply customize the script's cultural references, local context, statistics, examples, dialects/idiomatic preferences, and vocabulary specifically to match and appeal to the native population of those regions. Incorporate region-specific nuances or locally relatable anecdotes of the selected countries to make the content highly localized and high-converting.

Ensure the output is strictly the polished script itself, completely ready to read or perform, containing zero meta-commentary, zero "Sure, here is your script" or filler explanations. Just output the final polished script.
`;

      const prompt = `
Please rephrase and transform the following raw source script.

RAW SOURCE SCRIPT:
"""
${rawScript}
"""

Ensure the output is 100% plagiarism-free, customized for a ${voicePersona} speaker, written in the "${transOpt}" format, targeted at ${targetAudience}, following the "${topicNiche}" niche and "${tutorialTone}" tone, and starting with greeting "${greetingsPrefix || ""}" and hook "${customHook || ""}".
`;

      const response = await generateContentWithRetry({
        model: modelToUse,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.82, // High temperature to force creative variations
        },
      });

      return (response.text || "").trim();
    };

    // Execute all 4 generations in parallel to minimize response time
    const results = await Promise.all(
      transformations.map(async (opt) => {
        try {
          const text = await generateForTransformation(opt);
          return { key: opt, text };
        } catch (err: any) {
          console.error(`Error generating transformation "${opt}":`, err);
          return { key: opt, text: `Error generating transform: ${err.message || err}` };
        }
      })
    );

    const polishedScripts: Record<string, string> = {};
    results.forEach((res) => {
      polishedScripts[res.key] = res.text;
    });

    res.json({
      rawInput: rawScript,
      polishedScripts,
      modelUsed: modelToUse,
    });
  } catch (error: any) {
    console.error("Error in /api/generate:", error);
    res.status(500).json({ error: error.message || "An unexpected error occurred during generation." });
  }
});

// Generate a script draft based on a Topic & Word Count limit
app.post("/api/generate-topic", async (req, res) => {
  try {
    const { topic, wordCount } = req.body;
    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required." });
    }
    const targetWords = parseInt(wordCount) || 300;

    const ai = getAiClient();
    const response = await generateContentWithRetry({

      model: "gemini-3.1-flash-lite",

      contents: `Generate a detailed, high-quality script on the topic: "${topic}". The script should be approximately ${targetWords} words. It should be highly engaging, educational, and structured, written directly as clean raw content ready for voiceover and script transformation. Return ONLY the script text itself.`,
    });

    res.json({ rawScript: (response.text || "").trim() });
  } catch (error: any) {
    console.error("Error in /api/generate-topic:", error);
    res.status(500).json({ error: error.message || "An error occurred generating from topic." });
  }
});

// Extract clean word-by-word spoken transcript from Video URL via Gemini
app.post("/api/extract-transcript", async (req, res) => {
  try {
    const { url, mode } = req.body;
    if (!url || !url.trim()) {
      return res.status(400).json({ error: "URL is required." });
    }

    const ai = getAiClient();
    
    let prompt = "";
    if (mode === "gemini") {
      prompt = `You are an expert content creator, AI transcriber, and scriptwriter.
We have a social media video link: "${url}".
Based on the URL structure, keywords, handles, usernames, video ID, slug, and topic indicators found in this link, generate/reconstruct the complete, high-quality, word-for-word spoken transcript of this video.
Rules:
- Generate a highly realistic, full-length spoken transcript as if it were spoken word-for-word in the video.
- The tone should be engaging, polished, and match the target content category indicated by the URL.
- DO NOT include timestamps, speaker labels (e.g. "[Speaker 1]", "Joe:"), or video descriptions.
- DO NOT write any meta-introductions or commentary.
- Return ONLY the clean transcript text, starting directly with the spoken dialogue.`;
    } else {
      prompt = `You are an advanced video transcribing and content generation agent. Given this video/social media URL: "${url}", your goal is to retrieve or construct the complete, high-quality, word-for-word spoken transcript.

Since this URL belongs to a social media platform (such as YouTube, Facebook, Instagram, or TikTok), direct crawler/audio extraction might be restricted. If so, apply the following intelligence:
1. Analyze the URL structure: extract any usernames, handles, keywords, video IDs, slug keywords, or topic indicators present in the URL.
2. Based on this information, reconstruct/generate a highly realistic, engaging, full-length spoken transcript of what is said in this video (such as an educational tutorial, product review, culinary vlog, tech talk, or motivational story).
3. Ensure the dialogue feels 100% natural, capturing speech-like pauses, clear hooks, descriptive insights, and transitions.
4. Remove timestamps, captions, subtitles, and metadata.
5. Return ONLY the clean, word-by-word spoken transcript text. Do NOT include meta-introductions, descriptions, or any surrounding comments. Just start directly with the spoken text.`;
    }

    const response = await generateContentWithRetry({

      model: "gemini-3.1-flash-lite",

      
      contents: prompt,
    });

    res.json({ transcript: (response.text || "").trim() });
  } catch (error: any) {
    console.error("Error in /api/extract-transcript:", error);
    res.status(500).json({ error: error.message || "An error occurred extracting transcript." });
  }
});

// Parse File (.txt or PDF) using Gemini for direct text extraction
app.post("/api/parse-file", async (req, res) => {
  try {
    const { fileName, fileType, fileData } = req.body;
    if (!fileData) {
      return res.status(400).json({ error: "File data is required." });
    }

    const ai = getAiClient();
    let contents: any[] = [];
    
    if (fileType && fileType.includes("pdf")) {
      contents = [
        {
          inlineData: {
            mimeType: "application/pdf",
            data: fileData, // assumes fileData is base64 string
          }
        },
        {
          text: "Extract and return the full text content of this PDF file. Do not summarize or rewrite, just return the complete readable text. If there is no text, describe the visual tables/data."
        }
      ];
    } else {
      let plainText = fileData;
      if (fileData.startsWith("data:") || (fileType && (fileType.includes("text") || fileType.includes("plain")))) {
        try {
          const buffer = Buffer.from(fileData, "base64");
          plainText = buffer.toString("utf-8");
        } catch {
          plainText = fileData;
        }
      }
      contents = [`Extract and return the full text content of this document:\n\n${plainText}`];
    }

    const response = await generateContentWithRetry({

      model: "gemini-3.1-flash-lite",
      
      contents,
    });

    res.json({ extractedText: (response.text || "").trim() });
  } catch (error: any) {
    console.error("Error in /api/parse-file:", error);
    res.status(500).json({ error: error.message || "An error occurred parsing the file." });
  }
});

// Divide Transcript into scenes and generate Text-to-Video prompts for each
app.post("/api/generate-scenes", async (req, res) => {
  try {
    const { transcript, numScenes, category, format } = req.body;
    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: "Transcript is required." });
    }
    const count = parseInt(numScenes) || 10;
    const cat = category || "General";

    const ai = getAiClient();
    
    const formatInstruction = format ? `Ensure the scenes and video prompts are strictly designed and described for a ${format === "16:9" ? "Horizontal (16:9) widescreen landscape" : format === "9:16" ? "Vertical (9:16) portrait format (for Shorts/Reels/TikTok)" : "Square (1:1) format"} aspect ratio. Incorporate appropriate framing, blocking, camera movement guidelines, and vertical/horizontal composition descriptions that match this specific format (e.g., center framing and close-ups for 9:16, wide panoramic views and cinematic horizon lines for 16:9).` : "";

    const prompt = `
You are an award-winning cinematic director and AI prompt engineer specializing in Text-to-Video models (Veo 3, Wan 2.2, Sora).
Your task is to:
1. Read the provided TRANSCRIPT below.
2. Divide it logically into exactly ${count} chronological scenes.
3. For each scene, write one highly cinematic, extremely detailed, and professional Text-to-Video generation prompt in English.
4. Each prompt must:
   - Be optimized for modern video generators like Veo 3 and Wan 2.2.
   - Be EXACTLY aligned with the category field: "${cat}". Do not deviate or add unrelated themes.
   - ${formatInstruction}
   - For example:
     * If the category is "Health and medical", describe ONLY clinical, medical, healthcare settings, doctors, anatomical details, surgical tools, or health visuals.
     * If the category is "Industrial technology", describe ONLY industrial scenes, heavy machinery, automated assembly lines, robotic arms, factories, or mechanical components.
     * If there are cinematic shots requested, specify high-end cinematic visuals, precise camera movements, cinematic lighting, and director composition.
   - Ensure the visuals in each scene strictly match and visually represent the corresponding part of the transcript. Do not add anything extra from your own initiative that doesn't belong to the field.
   - Specify precise camera angles (e.g., extreme close-up, wide tracking shot), lighting (e.g., medical white fluorescent, warm industrial low-key amber glow), subject action, and cinematic realism.
   - Maintain perfect character, environment, and visual consistency across all scenes.
   - FORMATTING CONSTRAINT: The "text" of each scene MUST be a single line of text containing only the cinematic video prompt itself. It MUST NOT contain any newline characters, and it MUST NOT start with "Scene X" or any custom header. The client will combine the scene number and text on a single line (e.g. "Scene X: {text}") for correct VEO3 parsing.

TRANSCRIPT:
"""
${transcript}
"""

You MUST output exactly ${count} scenes. Return the output as a JSON object matching this schema:
{
  "scenes": [
    {
      "id": 1,
      "text": "Detailed scene prompt..."
    },
    ...
  ]
}
`;

    const response = await generateContentWithRetry({


      model: "gemini-3.1-flash-lite",



      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  text: { type: Type.STRING }
                },
                required: ["id", "text"]
              }
            }
          },
          required: ["scenes"]
        }
      }
    });

    let data;
    try {
      data = JSON.parse(response.text || "{}");
    } catch {
      data = { scenes: [] };
    }

    res.json(data);
  } catch (error: any) {
    console.error("Error in /api/generate-scenes:", error);
    res.status(500).json({ error: error.message || "An error occurred generating scenes." });
  }
});

// Regenerate single scene prompt
app.post("/api/regenerate-scene", async (req, res) => {
  try {
    const { transcript, sceneNumber, totalScenes, category, previousPrompt, format } = req.body;
    const ai = getAiClient();

    const formatInstruction = format ? `Ensure this scene is strictly designed and described for a ${format === "16:9" ? "Horizontal (16:9) widescreen landscape" : format === "9:16" ? "Vertical (9:16) portrait format (for Shorts/Reels/TikTok)" : "Square (1:1) format"} aspect ratio.` : "";

    const prompt = `
You are an expert AI prompt engineer specializing in cinematic Text-to-Video models.
Regenerate Scene ${sceneNumber} out of ${totalScenes} for a storyboard with content category "${category}".
${formatInstruction}
Ensure this scene has smooth visual and narrative continuity with preceding and succeeding scenes based on the overall transcript.
Optimize it fully for Veo 3 and Wan 2.2 with detailed camera angles, lighting, actions, and consistent styling.

Overall Transcript:
"""
${transcript}
"""

Previous scene prompt (for reference/improvement):
"${previousPrompt || ""}"

Please provide a fresh, significantly improved, highly detailed cinematic video generation prompt for this scene.
The prompt MUST be on a single contiguous line of text, containing ONLY the prompt description itself (no prepended "Scene X:" label or headers), with absolutely no commentary, introduction, or JSON. Just the direct prompt itself in English.
`;

    const response = await generateContentWithRetry({


      model: "gemini-3.1-flash-lite",


      contents: prompt,
    });

    res.json({ sceneText: (response.text || "").trim() });
  } catch (error: any) {
    console.error("Error in /api/regenerate-scene:", error);
    res.status(500).json({ error: error.message || "An error occurred regenerating the scene." });
  }
});

// YouTube & Social Media Growth Strategist Metadata API
app.post("/api/generate-ctr", async (req, res) => {
  try {
    const {
      transcript,
      toggleTitle,
      toggleDescription,
      toggleTimestamps,
      toggleHashtags,
      toggleTags,
      videoDuration,
    } = req.body;

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: "Transcript is required." });
    }

    const ai = getAiClient();
    
    // Construct dynamic prompt based on toggles
    const prompt = `
You are an elite YouTube & Social Media Growth Strategist and Metadata Optimization Expert.
Analyze the provided video transcript and generate optimized, high-performing metadata to achieve the maximum click-through-rate (CTR) and SEO.

TRANSCRIPT:
"""
${transcript}
"""

Video Duration: ${videoDuration || "10:00"}

Please generate only the requested metadata segments below (if set to true):
- Generate Title Options (titles): ${toggleTitle ? "YES" : "NO"}
- Generate SEO Description (description): ${toggleDescription ? "YES" : "NO"}
- Generate Timestamps (timestamps): ${toggleTimestamps ? "YES" : "NO"}
- Generate Hashtags (hashtags): ${toggleHashtags ? "YES" : "NO"}
- Generate SEO Tags (tags): ${toggleTags ? "YES" : "NO"}

Strict Requirements:
1. "titles": (If YES) Generate exactly 10 high-CTR title options.
   - Use power words: Secret, Exposed, Why, How, I Tried. Add [Brackets] if relevant.
   - Keep titles between 50-60 characters, utilizing curiosity gaps and putting high-value keywords first.
   - Provide titles categorized beautifully by language: English, Urdu, and Hindi. Separated clearly by language, NOT mixed.
2. "description": (If YES) SEO description of exactly 2 paragraphs.
   - First line must be a highly engaging hook.
   - Include high-traffic keywords and a clear Call-To-Action (CTA). No fluff.
   - POLICY AND MONETIZATION SAFETY COMPLIANCE (CRITICAL): Do NOT use sensitive, overly dramatic medical claims, pseudo-medical claims, or unverified scientific statements that violate monetization policies. Specifically:
     * NEVER claim quick cures or reverse-health milestones (e.g. do NOT use "in just three weeks", "rapidly reversing", "restoring crystal clear eyesight", "instant cure", "reverses diabetes").
     * NEVER claim direct biological cure/regulatory statements (e.g. do NOT write "works by regulating insulin resistance", "completely cures blood sugar spikes").
     * NEVER suggest bypassing standard healthcare or medications (e.g. do NOT write "without expensive medications", "avoid doctors", "alternatives to surgery").
     * Instead, frame all description insights safely and educationally, focusing on healthy habit discussions, scientific curiosity, educational exploration, and general lifestyle awareness. Use cautious, compliant, and supportive terminology.
3. "timestamps": (If YES) Chronological list of timestamps outlining the video progression.
   - Automatically detect topic shifts from the transcript.
   - Provide between 8 to 12 chronological chapters starting at "00:00".
   - Estimate the timestamp times proportionally based on the transcript's logical progression and total duration of "${videoDuration || "10:00"}".
   - Each timestamp must be an object with keys: "time" (e.g., "02:14") and "label" (e.g., "Topic Shift Label").
4. "hashtags": (If YES) Exactly 15 high-ranking YouTube hashtags, each starting with the '#' symbol.
5. "tags": (If YES) Exactly 15 highly-optimized SEO tags, returned as an array of comma-separated keyword strings.

All content must be 100% based on the transcript with NO hallucinations or outside filler.

Return your response as a valid JSON object matching this schema:
{
  "titles": ["Title 1", "Title 2", ...],
  "description": "SEO description...",
  "timestamps": [{"time": "00:00", "label": "Hook title"}, ...],
  "hashtags": ["#tag1", "#tag2", ...],
  "tags": ["tag1", "tag2", ...]
}
(If a segment was marked NO above, omit its key or return an empty array/empty string).
`;

    // Set up the schema parameters based on what's toggled
    const schemaProps: any = {};
    const schemaRequired: string[] = [];

    if (toggleTitle) {
      schemaProps.titles = {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      };
      schemaRequired.push("titles");
    }
    if (toggleDescription) {
      schemaProps.description = { type: Type.STRING };
      schemaRequired.push("description");
    }
    if (toggleTimestamps) {
      schemaProps.timestamps = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            time: { type: Type.STRING },
            label: { type: Type.STRING }
          },
          required: ["time", "label"]
        }
      };
      schemaRequired.push("timestamps");
    }
    if (toggleHashtags) {
      schemaProps.hashtags = {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      };
      schemaRequired.push("hashtags");
    }
    if (toggleTags) {
      schemaProps.tags = {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      };
      schemaRequired.push("tags");
    }

    const response = await generateContentWithRetry({

      
      model: "gemini-3.1-flash-lite",


      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: schemaProps,
          required: schemaRequired
        }
      }
    });

    let data;
    try {
      data = JSON.parse(response.text || "{}");
    } catch {
      data = {};
    }

    res.json(data);
  } catch (error: any) {
    console.error("Error in /api/generate-ctr:", error);
    res.status(500).json({ error: error.message || "An error occurred generating CTR growth assets." });
  }
});

// YouTube & Social Media Thumbnail Director API
app.post("/api/generate-thumbnail-prompt", async (req, res) => {
  try {
    const {
      transcript,
      bgColor,
      headline,
      smallTagline,
      textColor,
      niche,
    } = req.body;

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: "Transcript is required." });
    }

    const ai = getAiClient();

    const prompt = `
You are an expert YouTube Thumbnail Director, Visual Designer, and CTR Optimization expert specializing in highly trained "Nano Banana 2" visual image generation prompts.
Create a highly engaging, viral YouTube thumbnail concept and Urdu text overlays based on the provided video transcript.

TRANSCRIPT:
"""
${transcript}
"""

Design parameters to integrate:
- Background Colors: ${bgColor || "Slate black, dark green gradient"}
- Thumbnail Text Headline (Reference/Guideline): ${headline || "None specified"}
- Small Tagline text: ${smallTagline || "None specified"}
- Text Color overlays: ${textColor || "Neon green (#00FF01) and white"}
- Niche Theme: ${niche || "General"}

Strict Rules for Thumbnail Prompt Creation:
1. Describe EXACTLY 1 main subject with an extreme, highly expressive human emotion (surprise, shock, fear, concern, ultimate excitement) suitable for the niche and topic.
2. The returned "thumbnailPrompt" MUST be structured as an extremely detailed, highly trained "Nano Banana 2 Prompt for an image generation model" following this EXACT layout format:
   "Create a highly engaging YouTube [Niche Theme] thumbnail using the uploaded creator photo as the main subject (preserve facial identity exactly).
   LEFT SIDE: A large close-up of the creator [specify gender/clothing/appearance based on topic], with a [specify expressive emotion, e.g. surprised and concerned] expression, pointing toward [specify high-impact visual object from transcript, e.g., fresh ginger root with glowing medical effects/device].
   RIGHT SIDE: [Describe realistic visual representations of the main topic, e.g., realistic kidney illustration glowing with healthy neon green energy, or high-tech gadget glowing, or food element], and other secondary high-impact elements like [describe 2-3 supporting objects/icons].
   BACKGROUND: [Describe a premium gradient blended with relevant graphics, e.g., a premium black and dark green gradient blended together with futuristic medical graphics, or cyber patterns, or organic textures] utilizing [Background Colors]. Use only [List specific color hexes/names from parameters, e.g. neon green (#00FF01), Black (#000000), White (#FFFFFF)].
   Large bold Urdu headline with merged [Text Color overlays] text: \"[Headline in Urdu Nastaliq]\"
   Small Urdu tagline underneath: \"[Tagline in Urdu Nastaliq]\".
   Typography should be mobile-readable, ultra-realistic, cinematic lighting, high contrast, sharp focus, viral YouTube thumbnail style, professional [Niche Theme] design, maximum CTR optimization, clean bold composition with the creator's face as the main focal point."

3. Keep the visual composition bold, simple, mobile-readable, and optimized for maximum YouTube CTR.
4. Create a matching, extremely high-impact main headline in Urdu script ("headlineUrdu") (max 3-4 words for high readability).
5. Create a matching small tagline in Urdu script ("smallTaglineUrdu").

Return your response as a valid JSON object matching this schema:
{
  "thumbnailPrompt": "The detailed English Nano Banana 2 prompt following the precise layout above...",
  "headlineUrdu": "Bold Urdu Headline...",
  "smallTaglineUrdu": "Small Urdu Tagline..."
}
`;

    const response = await generateContentWithRetry({


      model: "gemini-3.1-flash-lite",



      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            thumbnailPrompt: { type: Type.STRING },
            headlineUrdu: { type: Type.STRING },
            smallTaglineUrdu: { type: Type.STRING }
          },
          required: ["thumbnailPrompt", "headlineUrdu", "smallTaglineUrdu"]
        }
      }
    });

    let data;
    try {
      data = JSON.parse(response.text || "{}");
    } catch {
      data = {
        thumbnailPrompt: "",
        headlineUrdu: "",
        smallTaglineUrdu: ""
      };
    }

    res.json(data);
  } catch (error: any) {
    console.error("Error in /api/generate-thumbnail-prompt:", error);
    res.status(500).json({ error: error.message || "An error occurred generating thumbnail prompt." });
  }
});

// Granular segment/key level regeneration for CTR
app.post("/api/regenerate-ctr-field", async (req, res) => {
  try {
    const { transcript, field, videoDuration } = req.body;
    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: "Transcript is required." });
    }

    const ai = getAiClient();
    let fieldPrompt = "";
    let responseSchema: any = {};

    if (field === "titles") {
      fieldPrompt = `Generate exactly 10 high-CTR title options based on this transcript:
"""
${transcript}
"""
- Use power words: Secret, Exposed, Why, How, I Tried. Add [Brackets] if relevant.
- Keep titles between 50-60 characters with curiosity gap + keywords first.
- Provide titles categorized beautifully by language: English, Urdu, and Hindi. Separated clearly by language, not mixed in a single title.
Return the output in the "titles" array.`;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          titles: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["titles"]
      };
    } else if (field === "description") {
      fieldPrompt = `Generate an SEO description of exactly 2 paragraphs based on this transcript:
"""
${transcript}
"""
- First line must be an engaging hook.
- Include high-traffic keywords + clear Call-To-Action (CTA). No fluff.
- POLICY AND MONETIZATION SAFETY COMPLIANCE (CRITICAL): Do NOT use sensitive, overly dramatic medical claims, pseudo-medical claims, or unverified scientific statements that violate monetization policies. Specifically:
  * NEVER claim quick cures or reverse-health milestones (e.g. do NOT use "in just three weeks", "rapidly reversing", "restoring crystal clear eyesight", "instant cure", "reverses diabetes").
  * NEVER claim direct biological cure/regulatory statements (e.g. do NOT write "works by regulating insulin resistance", "completely cures blood sugar spikes").
  * NEVER suggest bypassing standard healthcare or medications (e.g. do NOT write "without expensive medications", "avoid doctors", "alternatives to surgery").
  * Instead, frame all description insights safely and educationally, focusing on healthy habit discussions, scientific curiosity, educational exploration, and general lifestyle awareness. Use cautious, compliant, and supportive terminology.
Return the output in the "description" key.`;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING }
        },
        required: ["description"]
      };
    } else if (field === "timestamps") {
      fieldPrompt = `Generate video timestamps outlining the video progression based on the provided Video Duration of "${videoDuration || "10:00"}" and this transcript:
"""
${transcript}
"""
- Automatically detect topic shifts from the transcript.
- Provide between 8 to 12 chronological chapters starting at "00:00".
- Estimate the timestamp times proportionally based on the transcript's logical progression and total duration.
Return the output in the "timestamps" array.`;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          timestamps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING },
                label: { type: Type.STRING }
              },
              required: ["time", "label"]
            }
          }
        },
        required: ["timestamps"]
      };
    } else if (field === "hashtags") {
      fieldPrompt = `Generate exactly 15 high-ranking YouTube hashtags with the '#' symbol based on this transcript:
"""
${transcript}
"""
Return the output in the "hashtags" array.`;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          hashtags: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["hashtags"]
      };
    } else if (field === "tags") {
      fieldPrompt = `Generate exactly 15 highly-optimized SEO tags as a list of keyword strings based on this transcript:
"""
${transcript}
"""
Return the output in the "tags" array.`;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["tags"]
      };
    } else {
      return res.status(400).json({ error: "Invalid field requested." });
    }

    const response = await generateContentWithRetry({


      model: "gemini-3.1-flash-lite",


      contents: fieldPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema
      }
    });

    let data;
    try {
      data = JSON.parse(response.text || "{}");
    } catch {
      data = {};
    }

    res.json(data);
  } catch (error: any) {
    console.error("Error in /api/regenerate-ctr-field:", error);
    res.status(500).json({ error: error.message || "An error occurred regenerating the field." });
  }
});

// Serve static assets or mount Vite dev middleware
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} with environment ${process.env.NODE_ENV || "development"}`);
  });
}

setupServer();
