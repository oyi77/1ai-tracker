import { redirect } from 'next/navigation'

// /news is deprecated — canonical page is /news-feed
export default function NewsPage() {
  redirect('/news-feed')
}
