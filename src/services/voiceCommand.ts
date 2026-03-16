// src/services/voiceCommand.ts

export interface FarmingCommand {
  action: 'turn_on_motor' | 'turn_off_motor' | 'schedule_irrigation' | 'get_status' | 'unknown';
  time?: string;
  date?: string;
}

export interface FarmingCommand {
  action: 'turn_on_motor' | 'turn_off_motor' | 'schedule_irrigation' | 'get_status' | 'unknown';
  response?: string;
}

const OPENROUTER_API_KEY = import.meta.env.OPENROUTER_API_KEY;

/**
 * Fallback keyword logic to ensure the app works even without internet or API keys.
 */
function getKeywordResponse(transcript: string): FarmingCommand {
  const text = transcript.toLowerCase();
  
  // Keywords for ON (including Hindi script transliterations of English words)
  const onKeywords = [
    'chalu', 'shuru', 'start', 'on', 'open', 
    'चालू', 'शुरू', 'चलाओ', 'ऑन', 'स्टार्ट', 'ओपन'
  ];
  
  // Keywords for OFF
  const offKeywords = [
    'band', 'rok', 'stop', 'off', 'close', 
    'बंद', 'रोक', 'रोको', 'ऑफ', 'स्टॉप', 'क्लोज'
  ];
  
  // Keywords for Target
  const targetKeywords = [
    'motor', 'pump', 'paani', 'panni', 'water', 
    'मोटर', 'पंप', 'पानी', 'पम्प', 'वॉटर'
  ];

  const hasOn = onKeywords.some(word => text.includes(word));
  const hasOff = offKeywords.some(word => text.includes(word));
  const hasTarget = targetKeywords.some(word => text.includes(word));

  if (hasOn && hasTarget) return { action: 'turn_on_motor', response: "Turning motor ON." };
  if (hasOff && hasTarget) return { action: 'turn_off_motor', response: "Turning motor OFF." };
  
  // Simple check for just "chalu/on" or "band/off"
  if (onKeywords.some(word => text === word)) return { action: 'turn_on_motor', response: "Motor ON" };
  if (offKeywords.some(word => text === word)) return { action: 'turn_off_motor', response: "Motor OFF" };

  return { action: 'unknown' };
}

/**
 * A smart AI-based interpreter with a safety-net fallback.
 */
export async function interpretCommand(transcript: string): Promise<FarmingCommand> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "AgroSense Smart Farm"
      },
      body: JSON.stringify({
        "model": "meta-llama/llama-3.2-3b-instruct:free",
        "messages": [
          {
            "role": "system",
            "content": `You are a smart farming assistant. Extract intent and return ONLY JSON: {"action": "turn_on_motor"|"turn_off_motor"|"get_status", "response": "friendly reply"}`
          },
          { "role": "user", "content": transcript }
        ]
      })
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const data = await response.json();
    const text = data.choices[0].message.content;
    const jsonMatch = text.match(/\{.*\}/s);
    
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("Invalid AI response format");

  } catch (error) {
    console.warn("AI failed, falling back to keywords:", error);
    // SAFETY NET: If AI fails for ANY reason, use keywords
    return getKeywordResponse(transcript);
  }
}
