'use client'

import React, { useCallback, useRef, useState } from 'react'

import Image from 'next/image'

import SwiperCore from 'swiper'
import { Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'

import { Button } from '@/components/ui/button'

export const Tutorial: React.FC<{ completeButtonText: string; onCompleteTutorial: () => void }> = ({
  completeButtonText,
  onCompleteTutorial,
}) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const pageCount = 3
  // const isFirst = activeIndex === 0
  const isLast = activeIndex === pageCount - 1
  const swiperRef = useRef<SwiperCore | null>(null)

  const handleSlideChange = useCallback((swiper: { activeIndex: number }) => {
    setActiveIndex(swiper.activeIndex)
  }, [])

  // const slidePrev = () => {
  //   if (swiperRef.current != null) {
  //     swiperRef.current.slidePrev()
  //   }
  // }

  const slideNext = () => {
    if (swiperRef.current != null) {
      swiperRef.current.slideNext()
    }
  }

  return (
    <div className="grid h-full grid-rows-[1fr_auto_auto] gap-4">
      <Swiper
        onSwiper={(swiper) => (swiperRef.current = swiper)}
        slidesPerView={1}
        centeredSlides={true}
        pagination={{
          clickable: true,
          el: '.swiper-pagination',
        }}
        modules={[Pagination]}
        onSlideChange={handleSlideChange}
        className="w-full"
      >
        {[...Array(pageCount)].map((_, i) => {
          return (
            <SwiperSlide key={i}>
              <Image
                src={`/mini/assets/images/tutorial/tutorial-${i + 1}.png`}
                alt={`Slide ${i + 1}`}
                layout="fill"
                objectFit="contain"
                unoptimized
                priority={true}
              />
            </SwiperSlide>
          )
        })}
      </Swiper>

      <div className="swiper-pagination !static" />

      <div className="flex justify-center gap-4 p-4">
        {/* {!(isFirst || isLast) && (
          <Button variant="secondary" className="max-w-[170px] flex-1" onClick={() => slidePrev()}>
            <span className="i-lucide-chevron-left mr-2 h-4 w-4" />
            戻る
          </Button>
        )} */}
        <Button className="min-w-[170px]" onClick={() => (isLast ? onCompleteTutorial() : slideNext())}>
          {isLast ? completeButtonText : '次へ'}
          {/* {!isLast && <span className="i-lucide-chevron-right ml-2 h-4 w-4" />} */}
        </Button>
      </div>
    </div>
  )
}
