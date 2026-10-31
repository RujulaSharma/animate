import { Providers } from '@/components/home/providers'
import { Hero } from '@/components/home/hero'
import { BuildJourney } from '@/components/home/build-journey'
import { Footer } from '@/components/home/footer'

export default function Home() {
  return (
    <Providers>
      <main>
        <Hero />
        <BuildJourney />
      </main>
      <Footer />
    </Providers>
  )
}
