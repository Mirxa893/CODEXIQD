import { UseChatHelpers } from 'ai/react'

import { Button } from '@/components/ui/button'
import { ExternalLink } from '@/components/external-link'
import { IconArrowRight } from '@/components/ui/icons'

const exampleMessages = [
  {
    heading: 'Produce Flawless Code',
    message: `Can you help me write clean, optimized code for a specific problem?`
  },
  {
    heading: 'Explain Technical Concepts',
    message: 'What is a "serverless function"?'
  },
  {
    heading: 'Summarize an Article',
    message: 'Summarize the following article for a 2nd grader: \n'
  },
  {
    heading: 'Create an Image',
    message: 'Can you generate an image based on a description?'
  }
]

export function EmptyScreen({ setInput }: Pick<UseChatHelpers, 'setInput'>) {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="rounded-lg border bg-background p-8">
        <h1 className="mb-2 text-lg font-semibold">
          Welcome to the Codex-IQ!
        </h1>
        <p className="mb-2 leading-normal text-muted-foreground">
          You can start a conversation here or try the following services:
        </p>
        <div className="mt-4 flex flex-col items-start space-y-2">
          {exampleMessages.map((message, index) => (
            <Button
              key={index}
              variant="link"
              className="h-auto p-0 text-base"
              onClick={() => setInput(message.message)}
            >
              <IconArrowRight className="mr-2 text-muted-foreground" />
              {message.heading}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
