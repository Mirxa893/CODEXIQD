import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/db_types'

import { auth } from '@/auth'
import { nanoid } from '@/lib/utils'
import { supabase } from '@/lib/supabase' // Import Supabase client

const SPACE_URL = 'https://mirxakamran893-LOGIQCURVECODE.hf.space/chat'

export const runtime = 'edge'

// The main POST method to handle chat and file uploads
export async function POST(req: Request) {
  const cookieStore = cookies()
  const supabaseClient = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
  })
  const json = await req.json()
  const { messages, previewToken } = json
  const userId = (await auth({ cookieStore }))?.user.id

  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  if (previewToken) {
    // You may set another API key for preview, if needed
  }

  // Ensure that messages contain valid content
  const messageContents = messages.map((msg: { content: string }) => msg.content).join('\n')

  if (!messageContents.trim()) {
    return new Response('⚠️ Please enter a valid message.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  // Handle file upload if it's part of the request
  if (req.method === 'POST' && req.headers.get('content-type')?.includes('multipart/form-data')) {
    const formData = await req.formData()
    const file = formData.get('file')

    if (file && file instanceof Blob) {
      const fileName = `${nanoid()}_${file.name}`
      const filePath = `uploads/${fileName}`

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage.from('chat-files').upload(filePath, file)

      if (error) {
        return new Response(`Error uploading file: ${error.message}`, { status: 500 })
      }

      // Get the public URL of the uploaded file
      const { data: fileData } = supabase.storage.from('chat-files').getPublicUrl(filePath)
      const fileUrl = fileData.publicUrl

      // Process the file URL with AI model (Hugging Face or another AI model)
      const aiResponse = await processFileWithAI(fileUrl)

      // Return AI response
      return new Response(aiResponse.response, { status: 200 })
    }
  }

  // AI Processing Logic (existing logic without file upload)
  const history: [string, string][] = [] // Empty history for now

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000) // 60 seconds timeout

  try {
    const res = await fetch(SPACE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: messageContents, // Send the current user message
        history, // Send the conversation history (empty in this case)
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => '')
      console.error(`❌ HF error ${res.status}:`, errText)
      return new Response(`🤖 Error ${res.status}: HF Space failed.`, {
        status: res.status,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    const data = await res.json().catch(() => ({}))
    const reply = data?.response || '⚠️ No valid response received.'

    // Save chat into the database
    const title = messageContents.substring(0, 100)
    const id = json.id ?? nanoid()
    const createdAt = Date.now()
    const path = `/chat/${id}`
    const payload = {
      id,
      title,
      userId,
      createdAt,
      path,
      messages: [
        ...messages,
        {
          content: reply,
          role: 'assistant',
        },
      ],
    }

    // Insert chat into the database.
    await supabaseClient.from('chats').upsert({ id, payload }).throwOnError()

    return new Response(reply, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })

  } catch (err: any) {
    const isTimeout = err.name === 'AbortError'
    const message = isTimeout
      ? '⌛ Timeout: Hugging Face Space took too long to respond.'
      : `❌ Unexpected error: ${err.message || 'unknown'}`

    return new Response(message, {
      status: isTimeout ? 504 : 500,
      headers: { 'Content-Type': 'text/plain' },
    })
  }
}

// Simulate AI processing based on file URL
async function processFileWithAI(fileUrl: string) {
  // Here, you can replace this with your actual AI model integration (e.g., Hugging Face)
  return {
    response: `AI Response based on uploaded file at: ${fileUrl}`,
  }
}
