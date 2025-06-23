import 'server-only'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/db_types'

import { auth } from '@/auth'
import { nanoid } from '@/lib/utils'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

const SPACE_URL = 'https://mirxakamran893-LOGIQCURVECODE.hf.space/chat'

export const runtime = 'edge'

// Configuring Formidable to handle file uploads
const form = formidable({
  uploadDir: './public/uploads', // Change to your preferred location
  keepExtensions: true, // Retain file extensions
  maxFileSize: 10 * 1024 * 1024, // Max file size 10MB
})

export async function POST(req: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient<Database>({
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

  // Ensure messages have valid content
  const messageContents = messages.map((msg: { content: string }) => msg.content).join('\n')

  if (!messageContents.trim()) {
    return new Response('⚠️ Please enter a valid message.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  // Initialize conversation history
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
    await supabase.from('chats').upsert({ id, payload }).throwOnError()

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

// This function will handle the file upload (called from the frontend)
export async function fileUpload(req: Request) {
  return new Promise((resolve, reject) => {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        return reject(new Response('File upload failed', { status: 500 }))
      }

      const file = files?.file[0]
      if (!file) {
        return reject(new Response('No file uploaded', { status: 400 }))
      }

      const filePath = path.join(process.cwd(), 'public/uploads', file.newFilename)
      
      // Process the uploaded file (for example, read text files, PDFs, or other formats)
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8')
        
        // Send file content to Hugging Face or your AI model
        const aiResponse = await processFileWithAI(fileContent)

        resolve(aiResponse)
      } catch (error) {
        reject(new Response('Error processing file content', { status: 500 }))
      }
    })
  })
}

// Simulating AI processing of file content
async function processFileWithAI(fileContent: string) {
  // Simulating sending file content to AI model (Hugging Face or other)
  return {
    response: `AI Response based on uploaded file content: ${fileContent.slice(0, 100)}...`,
  }
}
