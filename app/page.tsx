import AppPreview from "@/components/AppPreview"
import FullBleedLine from "@/components/FullBleedLine"
import Hero from "@/components/Hero"

export default function HomePage() {
  return (
    <>
      <Hero />
      <div className="relative">
        <FullBleedLine className="top-0" />
        <section id="features" className="isolate min-h-[40rem] overflow-hidden bg-[var(--showcase-background)] px-4 pb-24 pt-[4.5rem]">
          <div className="relative z-10 -mt-[8.5rem]">
            <AppPreview />
          </div>
        </section>
      </div>
    </>
  )
}
