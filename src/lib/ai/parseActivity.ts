import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!)

type ParsedActivity = {
  metric: string
  value: number
  unit: string
  category: 'health' | 'relationships' | 'learning' | 'career' | 'finance' | 'mindfulness' | 'custom'
  confidence: number
  is_new_metric: boolean
}

export async function parseNaturalLanguage(
  message: string,
  existingMetrics: string[]
): Promise<ParsedActivity[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

  const prompt = `You are a life tracking assistant. Extract trackable activities from this message.

The user already tracks: ${existingMetrics.join(', ')}

Message: "${message}"

Return ONLY a JSON array. Each item needs:
- metric: snake_case name
- value: number
- unit: what's measured
- category: health/relationships/learning/career/finance/mindfulness/custom
- confidence: 0-1
- is_new_metric: boolean

If nothing trackable, return []
Return ONLY valid JSON, no explanation.`

  const result = await model.generateContent(prompt)
  const responseText = result.response.text()
  
  try {
    const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleanJson)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('Failed to parse Gemini response:', responseText, error)
    return []
  }
}



// import OpenAI from 'openai'

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// })

// type ParsedActivity = {
//   metric: string
//   value: number
//   unit: string
//   category: 'health' | 'relationships' | 'learning' | 'career' | 'finance' | 'mindfulness' | 'custom'
//   confidence: number
//   is_new_metric: boolean
// }

// export async function parseNaturalLanguage(
//   message: string,
//   existingMetrics: string[]
// ): Promise<ParsedActivity[]> {
//   const completion = await openai.chat.completions.create({
//     model: 'gpt-4o-mini',
//     messages: [
//       {
//         role: 'system',
//         content: `You are a life tracking assistant. Extract trackable activities from the user's message.

// The user already tracks these metrics: ${existingMetrics.join(', ')}

// Return ONLY a JSON array. Each item should have:
// - metric: snake_case name (match existing if similar, create new if genuinely different)
// - value: numeric value
// - unit: what is being measured
// - category: one of [health, relationships, learning, career, finance, mindfulness, custom]
// - confidence: 0-1 (how certain you are about the extraction)
// - is_new_metric: boolean (true if this metric doesn't exist in the user's list)

// Examples:
// "ran 5km" → {"metric": "distance_run", "value": 5, "unit": "km", "category": "health", "confidence": 0.95, "is_new_metric": true}
// "read 40 pages" → {"metric": "pages_read", "value": 40, "unit": "pages", "category": "learning", "confidence": 0.99, "is_new_metric": true}
// "called mum for 20 mins" → {"metric": "family_call_minutes", "value": 20, "unit": "minutes", "category": "relationships", "confidence": 0.97, "is_new_metric": false}
// "listened to audible for an hour" → {"metric": "audible_minutes", "value": 60, "unit": "minutes", "category": "learning", "confidence": 0.92, "is_new_metric": true}
// "drank 8 glasses of water" → {"metric": "water_glasses", "value": 8, "unit": "glasses", "category": "health", "confidence": 0.99, "is_new_metric": true}
// "sent 10 emails to investors" → {"metric": "investor_emails", "value": 10, "unit": "emails", "category": "career", "confidence": 0.95, "is_new_metric": true}

// If nothing trackable is in the message, return an empty array.
// Return ONLY valid JSON, no markdown, no explanation.`
//       },
//       {
//         role: 'user',
//         content: message
//       }
//     ],
//     temperature: 0.3,
//   })

//   const responseText = completion.choices[0].message.content || '[]'
  
//   try {
//     // Parse the response, handling potential markdown wrapping
//     const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
//     const parsed = JSON.parse(cleanJson)
    
//     // If it's wrapped in an object with "activities" key, unwrap it
//     if (parsed.activities && Array.isArray(parsed.activities)) {
//       return parsed.activities
//     }
    
//     // Otherwise assume it's already an array
//     return Array.isArray(parsed) ? parsed : []
//   } catch (error) {
//     console.error('Failed to parse AI response:', responseText, error)
//     return []
//   }
// }

