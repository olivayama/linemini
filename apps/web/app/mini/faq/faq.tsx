'use client'

import React from 'react'

import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

import FaqObj from './faq.json'

export const FAQ: React.FC = () => {
  return (
    <div className="space-y-8">
      {FaqObj != null &&
        FaqObj.sections.map((section) => (
          <div key={section.title}>
            <h2 className="mb-4 text-xl font-bold">{section.title}</h2>
            <Accordion type="single" collapsible className="w-full">
              {section.items.map((item) => (
                <AccordionItem key={item.question} value={item.question}>
                  <AccordionTrigger className="">
                    <span className="text-left">{item.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="sanitized-html">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                      components={{
                        p: ({ children }) => <p style={{ marginBottom: '1em', wordBreak: 'break-all' }}>{children}</p>,
                        a: ({ children, href }) => (
                          <a href={href} target="_blank" rel="noopener noreferrer">
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {item.answer}
                    </ReactMarkdown>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
    </div>
  )
}
