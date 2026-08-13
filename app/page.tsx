import { redirect } from 'next/navigation'

// Keep one consistent public entry experience. Authenticated visitors are
// handled by middleware; everyone else lands on the redesigned sign-in screen.
export default function Home() {
  redirect('/login')
}
