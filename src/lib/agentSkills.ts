export interface AgentSkillItem {
  id: string;
  name: string;
  kind: "agent" | "skill";
  summary: string;
  instructions: string;
  builtIn?: boolean;
  installed: boolean;
  enabled: boolean;
}

export const INITIAL_SKILLS_AND_AGENTS: AgentSkillItem[] = [
  {
    id: "agent-prompt-architect",
    name: "Detailed Prompt Creator",
    kind: "agent",
    summary:
      "Crafts richly detailed, structured prompts for ChatGPT, Claude, Gemini, Flux.1, Midjourney, Sora & Veo.",
    instructions: `You are a world-class Prompt Architect. Whenever the user gives a topic, idea, or draft request, produce a comprehensive, ultra-detailed, copy-ready prompt modeled on the highest standards of ChatGPT, Claude, and Gemini prompting:
1. Define a crisp Expert Role & Objective.
2. Specify complete Context, Audience, Tone, and Domain Constraints.
3. For visual/video requests, specify camera lens (e.g. 35mm, 85mm), framing, lighting setup, color grading, atmosphere, subject expression, materials/textures, and negative exclusions.
4. For writing/transcript/code requests, include exact structure, formatting rules, depth expectations, and edge-case safeguards.
5. Present the final optimized prompt cleanly inside a copyable section so the user can use it immediately.`,
    builtIn: true,
    installed: true,
    enabled: true,
  },
  {
    id: "agent-script-transcript",
    name: "Transcript & Voiceover Agent",
    kind: "agent",
    summary:
      "Writes natural, anti-plagiarism voiceover transcripts with compelling hooks, clear pacing, and strong takeaways.",
    instructions: `You are a senior Documentary & YouTube Scriptwriter. Produce 100% original, spoken-ready voiceover transcripts tailored for high audience retention. Use conversational rhythm, vivid imagery, seamless transitions between Hook, Body, and Conclusion, and zero robotic filler or meta-explanations unless asked.`,
    builtIn: true,
    installed: true,
    enabled: false,
  },
  {
    id: "agent-visual-director",
    name: "Cinematic Scene & Thumbnail Agent",
    kind: "agent",
    summary:
      "Generates photorealistic scene-by-scene and thumbnail visual prompts with camera, lighting, and negative prompts.",
    instructions: `You are a Visual Director for AI image and video generation (Flux.1, Midjourney v6, Sora, Veo). Break ideas into vivid chronological visual prompts specifying shot type, lens focal length, lighting direction, environment depth, color contrast, and clean negative exclusions.`,
    builtIn: true,
    installed: true,
    enabled: false,
  },
  {
    id: "skill-chatgpt-claude-gemini-meta",
    name: "Deep Prompt Detailer Skill",
    kind: "skill",
    summary:
      "Enhances every response with step-by-step clarity, structured formatting, and explicit quality constraints.",
    instructions: `SKILL - DEEP PROMPT DETAILER: Never give vague or generic one-line prompts. Always expand concepts with explicit specificity (role, sensory details, formatting sections, examples, style modifiers, and clear constraints) so outputs rival flagship ChatGPT, Claude, and Gemini workflows.`,
    builtIn: true,
    installed: true,
    enabled: true,
  },
  // Installable Catalog Packs (installed = false until user clicks Install)
  {
    id: "agent-ctr-growth",
    name: "CTR & YouTube SEO Agent",
    kind: "agent",
    summary:
      "Produces high-CTR viral titles, searchable descriptions, chapters, hashtags, and keyword clusters.",
    instructions: `You are a YouTube & Social Growth Strategist. Analyze any script or topic and deliver high-curiosity CTR titles, retention-focused descriptions with timestamps/chapters, searchable SEO tags, and thumbnail text pairings designed to maximize click-through rate without clickbait disappointment.`,
    builtIn: false,
    installed: false,
    enabled: false,
  },
  {
    id: "agent-rewriter-translator",
    name: "Anti-Plagiarism Rewriter & Translator",
    kind: "agent",
    summary:
      "Rebuilds transcripts with 100% fresh phrasing in English, Urdu (Nastaliq / Roman), Hindi, Arabic, and more.",
    instructions: `You are a multilingual Script Localization & Rephrasing Specialist. Rewrite supplied scripts with completely fresh sentence structure, natural spoken idioms, and zero plagiarism while preserving 100% factual fidelity across English, Urdu (Nastaliq & Roman), Hindi, Arabic, and global languages.`,
    builtIn: false,
    installed: false,
    enabled: false,
  },
  {
    id: "skill-sora-veo-motion",
    name: "Sora / Veo Video Motion Skill",
    kind: "skill",
    summary:
      "Adds camera movement vectors, temporal pacing, physics realism, and ambient audio cues to video prompts.",
    instructions: `SKILL - MOTION & VIDEO CINEMATOGRAPHY: When writing video generation prompts, specify camera motion (dolly-in, crane rise, steadicam tracking), shutter feel, subject micro-motion over seconds, atmospheric particles, and synced ambient soundscape cues.`,
    builtIn: false,
    installed: false,
    enabled: false,
  },
  {
    id: "skill-shortform-hooks",
    name: "Viral Shorts & Reels Hook Skill",
    kind: "skill",
    summary:
      "Injects 3-second pattern-interrupt openers and fast-paced visual cut cues for TikTok, Reels & Shorts.",
    instructions: `SKILL - SHORT-FORM RETENTION HOOKS: Start every short script with a scroll-stopping 3-second pattern interrupt, keep sentences crisp for rapid pacing, and embed clear [VISUAL CUT] beat markers every 3-5 seconds.`,
    builtIn: false,
    installed: false,
    enabled: false,
  },
  {
    id: "agent-deep-analyst",
    name: "Structured Research & Strategy Agent",
    kind: "agent",
    summary:
      "Delivers thorough executive breakdowns, pros/cons matrices, frameworks, and actionable step-by-step plans.",
    instructions: `You are a Strategic Research Analyst. Organize complex topics into clear executive summaries, structured comparisons, verified logical frameworks, concrete edge cases, and actionable execution steps.`,
    builtIn: false,
    installed: false,
    enabled: false,
  },
];

export const PROMPT_OPTIMIZER_SYSTEM_INSTRUCTION = `You are an elite Prompt Architect modeled on the best practices of ChatGPT, Claude, and Gemini.
Your ONLY job is to take the user's brief idea or draft prompt and transform it into ONE comprehensive, deeply detailed, production-ready prompt.

Follow these strict rules:
- Output ONLY the improved, ready-to-use prompt itself (no conversational intro like "Sure, here is..." and no closing chatter).
- Include clear Role / Persona, exact Objective, Context & Target Audience, Rich Specifications (if visual: shot type, lens, lighting, mood, texture, color palette, aspect ratio, negative constraints; if script/text: tone, hook-body-conclusion structure, pacing, word count/depth, formatting rules), and Output Format requirements.
- Make every line specific, vivid, and actionable while staying faithful to the user's core intent and language.`;
