import React from 'react'

import { WaitSessionInit } from '@/components/wait-session-init'

// import { PageTransitionAnimation } from '@/components/page-transition-animation'
import { InitSession } from './init-session'
import { PageRouter } from './page-router'

export default function Template(props: { children: React.ReactNode }) {
  return (
    <>
      <InitSession />
      <WaitSessionInit>
        <PageRouter>{props.children}</PageRouter>
      </WaitSessionInit>
      {/* <PageTransitionAnimation>{props.children}</PageTransitionAnimation> */}
    </>
  )
}
